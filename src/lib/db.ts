import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Supabase pgbouncer (Transaction mode) + Vercel Serverless の組合せでは、
 * Prisma の接続プールサイズが大きすぎると pgbouncer の上限を超えて
 * P2024 (Timed out fetching a new connection) が頻発する。
 *
 * 環境変数 `DATABASE_URL` に `connection_limit` が含まれていない場合は、
 * **デフォルトで 1 を強制**して Lambda 単位で 1 接続のみ確保する。
 * env 設定漏れや staging 等の他環境でも同じ挙動になる安全装置。
 *
 * 既に `connection_limit=N` が指定されていれば尊重する。
 *
 * Vercel env 側で明示的に変更したい場合は DATABASE_URL を編集すれば良い。
 */
function buildDatabaseUrl(): string | undefined {
  const original = process.env.DATABASE_URL
  if (!original) return undefined
  let url = original
  // Lambda 単位の connection_limit。
  // 3 だと admin dashboard の 17 並列クエリ + ensureSchema が同時稼働した時に
  // P2024 が発生していた。Supabase pgbouncer Transaction mode の上限
  // (Pro 200) を想定 Lambda 同時数 ~20 で割って 10 が安全側。
  if (!/[?&]connection_limit=/.test(url)) {
    const sep = url.includes("?") ? "&" : "?"
    url = `${url}${sep}connection_limit=10`
  }
  // pool_timeout を 30 秒に伸ばす (デフォルト 10s は Promise.all で並列度高いと足りない)
  if (!/[?&]pool_timeout=/.test(url)) {
    const sep = url.includes("?") ? "&" : "?"
    url = `${url}${sep}pool_timeout=30`
  }
  return url
}

const datasourceUrl = buildDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

/**
 * 一時的な接続エラーのときだけ 1 回リトライする読み取り用ラッパー。
 *
 * Supabase pooler は瞬断することがあり、本番で P1001 (Can't reach database
 * server) が /jobs/[id] や /journal/[slug] の SSR から未捕捉で throw され、
 * 訪問者と Googlebot にエラーページを返していた。瞬断はほぼ数百 ms で
 * 回復するため、短い待機を挟んで再試行する。
 *
 * 冪等な読み取りクエリにだけ使うこと (書き込みは二重実行の恐れがある)。
 */
const TRANSIENT_DB_ERROR_CODES = new Set([
  "P1001", // Can't reach database server
  "P1002", // Database server timed out
  "P1008", // Operations timed out
  "P1017", // Server has closed the connection
  // P2024 (接続プールのタイムアウト) は含めない。プールが枯渇している最中に
  // 30 秒待った後でもう 30 秒並び直すことになり、枯渇を長引かせるだけだった。
])

export function isTransientDbError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false
  const e = error as { code?: unknown; errorCode?: unknown; name?: unknown }
  if (typeof e.code === "string" && TRANSIENT_DB_ERROR_CODES.has(e.code)) return true
  if (typeof e.errorCode === "string" && TRANSIENT_DB_ERROR_CODES.has(e.errorCode)) {
    return true
  }
  return e.name === "PrismaClientInitializationError"
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  { retries = 1, delayMs = 200 }: { retries?: number; delayMs?: number } = {}
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn()
    } catch (error) {
      if (attempt >= retries || !isTransientDbError(error)) throw error
      await new Promise((resolve) => setTimeout(resolve, delayMs * (attempt + 1)))
    }
  }
}

/**
 * 接続枯渇 (プール待ちのタイムアウト) を表すエラーかどうか。
 *  - P2024: Prisma 側のプール待ちが pool_timeout を超えた
 *  - ECHECKOUTTIMEOUT / ECHECKOUTRETRIES: Supabase pooler 側で接続を払い出せなかった
 */
const POOL_EXHAUSTION_PATTERN =
  /P2024|ECHECKOUTTIMEOUT|ECHECKOUTRETRIES|Timed out fetching a new connection/i

export function isPoolExhaustionError(error: unknown): boolean {
  if (!error) return false
  if (typeof error === "object") {
    const code = (error as { code?: unknown }).code
    if (code === "P2024") return true
  }
  const message = error instanceof Error ? error.message : String(error)
  return POOL_EXHAUSTION_PATTERN.test(message)
}

/**
 * 接続枯渇を観測した直後は、無くても画面が成り立つ DB アクセス
 * (閲覧ログ・検索ログ・スキーマ自己修復) を一定時間止める。
 *
 * 枯渇中もこれらはリクエストのたびに発行され、プールの待ち行列に 30 秒ずつ
 * 並び続けて、求人の表示に必要なクエリの順番を遅らせていた (本番ログでは
 * 障害の間じゅう [track] / [ensureSchema] の失敗が画面のエラーと同数出ていた)。
 * インスタンス単位の目安であり、厳密な制御ではない。
 */
const DB_PRESSURE_WINDOW_MS = 30_000
let dbPressureUntil = 0

export function markDbPressure(now: number = Date.now()): void {
  dbPressureUntil = now + DB_PRESSURE_WINDOW_MS
}

export function isDbUnderPressure(now: number = Date.now()): boolean {
  return now < dbPressureUntil
}

/** エラーが接続枯渇なら記録する。枯渇だった場合 true。 */
export function noteDbError(error: unknown): boolean {
  if (!isPoolExhaustionError(error)) return false
  markDbPressure()
  return true
}

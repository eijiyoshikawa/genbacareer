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
  "P2024", // Timed out fetching a new connection from the pool
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

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
  // 以前 10 に引き上げたところ、本番監視 (Vercel runtime errors) で
  // /jobs, /jobs/[id], /jobs/[id]/apply, /journal, /jobs/map 等の主要導線で
  // ECHECKOUTTIMEOUT / P2024 (pool exhausted) が直近 7 日で 179 件発生し、
  // ユーザー向け 500 エラーになっていることを確認 (2026-07-31 定期バグ検査)。
  // 同時 Lambda 数が増える一般トラフィックでは「Lambda 数 × limit」が
  // pgbouncer 側の上限を超えやすいため、Lambda 単位の limit は低く保つ方が
  // 全体のプール枯渇を防げる。admin dashboard の 17 並列クエリは全て
  // `.catch()` で 0/空配列にフォールバックする設計になっており、
  // 低い connection_limit 下で個別クエリが詰まっても画面自体はクラッシュしない
  // (数値が一時的に 0 表示になるのみ)。そのため一般導線を優先して 3 に戻す。
  if (!/[?&]connection_limit=/.test(url)) {
    const sep = url.includes("?") ? "&" : "?"
    url = `${url}${sep}connection_limit=3`
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

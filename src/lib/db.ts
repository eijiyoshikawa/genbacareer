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
  // 既に connection_limit を指定済みなら触らない
  if (/[?&]connection_limit=/.test(original)) return original
  const separator = original.includes("?") ? "&" : "?"
  return `${original}${separator}connection_limit=1`
}

const datasourceUrl = buildDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient(datasourceUrl ? { datasourceUrl } : undefined)

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

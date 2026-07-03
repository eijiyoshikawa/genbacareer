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
 * ensureSchema の自己修復は、これまで app/layout.tsx (ページレンダリング経路) からの
 * fire-and-forget 呼び出しのみに依存していた。Vercel は Route Handler 専用の Lambda を
 * 別インスタンスとして起動することがあり、その cold start ではページを一度も
 * レンダリングしないため ensureSchema が実行されず、db push 未反映のカラムに対して
 * P2022 (column does not exist) が発生していた
 * (例: 2026-07-01 /api/registration/wizard が point_balance 列で 500)。
 *
 * prisma モジュール読み込み時に一度だけ発火させることで、prisma を使う経路を
 * ページ/API 問わず確実にカバーする。ensure-schema.ts 側は本ファイルの prisma を
 * 参照するため動的 import で読み込む (循環 import 回避 + ビルド時は no-op)。
 */
if (process.env.NEXT_PHASE !== "phase-production-build") {
  import("./ensure-schema")
    .then(({ ensureSchema }) => void ensureSchema())
    .catch(() => {})
}

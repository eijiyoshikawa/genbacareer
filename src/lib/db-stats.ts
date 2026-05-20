/**
 * 大きいテーブルの全件 count を高速化するための近似カウントユーティリティ。
 *
 * `prisma.user.count()` (WHERE 無し) は全件 seq scan が走り、
 * テーブルが大きいと数秒〜数十秒かかる。さらに connection_limit が
 * 小さい環境では接続を専有して P2024 (pool timeout) を誘発する。
 *
 * 解決策: PostgreSQL の `pg_class.reltuples` から ANALYZE 由来の
 * 推定行数を読む。これは ms オーダーで返る。
 *
 * 用途: ダッシュボードの「累計 求職者数 / 累計 応募数」など、
 * 多少ズレても許容できる総数表示。±数%程度の誤差。
 *
 * 注意:
 *   - VACUUM/ANALYZE が走っていないテーブルでは 0 を返すことがある
 *   - 0 の場合は呼び出し側でフォールバックして null を返すと安全
 */

import { prisma } from "@/lib/db"

export async function approximateCount(table: string): Promise<number> {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ estimate: bigint }>>(
      `SELECT reltuples::bigint AS estimate FROM pg_class WHERE relname = $1 LIMIT 1`,
      table
    )
    const estimate = rows[0]?.estimate
    if (estimate == null) return 0
    const n = Number(estimate)
    return n < 0 ? 0 : n
  } catch {
    return 0
  }
}

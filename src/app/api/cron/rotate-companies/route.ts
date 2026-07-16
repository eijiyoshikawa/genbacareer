/**
 * C8 公平ローテーション: 全 Company の rotationKey を日次更新する cron。
 *
 * 毎日 03:30 UTC (= 12:30 JST) に Vercel Cron Jobs から呼び出す。
 * Authorization ヘッダーで CRON_SECRET を検証。
 *
 * 動作:
 *   各 Company.rotationKey を 0..999_999 のランダム整数で更新。
 *   /jobs 等の一覧 orderBy で
 *     [company.planTier desc, company.rotationKey asc, ...]
 *   を使うため、同 planTier 内では日次でランダムな順序になり、
 *   paid プラン (tier 3) 企業の機会均等を実現する。
 *
 * 更新対象: 全企業 (HelloWork 含む)。
 * パフォーマンス: 約 45,000 行の UPDATE で 1-2 秒程度を想定。
 */

import { prisma } from "@/lib/db"
import { verifyCronAuth } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const MAX_ROTATION_KEY = 1_000_000

export async function GET(request: Request) {
  const authError = verifyCronAuth(request)
  if (authError) return authError

  const now = new Date()

  // 全企業を 1 つの SQL で更新 (Postgres の random() を使う)。
  // 大量行を Prisma の updateMany ループで処理すると遅いので、$executeRaw で一括。
  const result = await prisma.$executeRawUnsafe<number>(
    `UPDATE companies SET rotation_key = floor(random() * ${MAX_ROTATION_KEY})::int`,
  )

  console.log(`[cron/rotate-companies] updated=${result}`)

  return Response.json({
    ok: true,
    updated: result,
    timestamp: now.toISOString(),
  })
}

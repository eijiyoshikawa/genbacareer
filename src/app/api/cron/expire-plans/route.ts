/**
 * 月額 / SNS プラン満了後の planTier 降格 cron (C2 補完)。
 *
 * 毎日 05:00 UTC (= 14:00 JST) に Vercel Cron Jobs から呼び出す。
 * Authorization ヘッダーで CRON_SECRET を検証。
 *
 * 対象:
 *   planType ∈ (monthly_12, monthly_24, sns_client) AND
 *   planPaidUntil < now AND
 *   planTier > 0  ← 既に降格済みは対象外 (idempotent)
 *
 * 動作:
 *   planTier = 0 にセット。
 *   planType / planPaidUntil は監査のためそのまま残す。
 *   /jobs 等の orderBy は planTier desc を使うため、降格後は最下位に。
 *
 * 期限なしプラン (success_fee / campaign_free) は対象外。
 */

import { prisma } from "@/lib/db"
import { isCronAuthorized, cronUnauthorizedResponse } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse()
  }

  const now = new Date()

  const result = await prisma.company.updateMany({
    where: {
      planType: { in: ["monthly_12", "monthly_24", "sns_client"] },
      planPaidUntil: { lt: now },
      planTier: { gt: 0 },
    },
    data: {
      planTier: 0,
    },
  })

  console.log(`[cron/expire-plans] downgraded=${result.count}`)

  return Response.json({
    ok: true,
    downgraded: result.count,
    timestamp: now.toISOString(),
  })
}

import { prisma } from "@/lib/db"

/**
 * 有効期限切れ求人のクローズ + 自動再掲載 (auto_renew) 求人の延長
 *
 * Vercel Cron Jobs や外部スケジューラから定期的に呼び出す。
 * Authorization ヘッダーで CRON_SECRET を検証。
 *
 * 動作:
 *   1. auto_renew = true の期限切れ求人 → expiresAt を +30 日延長して active を維持
 *   2. auto_renew = false の期限切れ求人 → status = "closed"
 */

const AUTO_RENEW_EXTENSION_MS = 30 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()
  const errors: string[] = []

  // 1) 自動再掲載: expiresAt を +30 日延長
  let renewTarget: { id: string; expiresAt: Date | null }[] = []
  try {
    renewTarget = await prisma.job.findMany({
      where: {
        status: "active",
        autoRenew: true,
        expiresAt: { lte: now },
      },
      select: { id: true, expiresAt: true },
      take: 500,
    })
  } catch (e) {
    errors.push(`renew-query: ${e instanceof Error ? e.message : e}`)
  }

  let renewed = 0
  for (const j of renewTarget) {
    const newExpiry = new Date(
      (j.expiresAt?.getTime() ?? now.getTime()) + AUTO_RENEW_EXTENSION_MS
    )
    try {
      await prisma.job.update({
        where: { id: j.id },
        // 自動再掲載では expiresAt のみ延長し、publishedAt（初回公開日）は保持する。
        // publishedAt を now に更新するとランキングの「新着」ブーストを毎回受けてしまうため。
        data: { expiresAt: newExpiry },
      })
      renewed++
    } catch (e) {
      errors.push(`renew:${j.id}: ${e instanceof Error ? e.message : e}`)
    }
  }

  // 2) auto_renew でないものは closed に
  let closedCount = 0
  try {
    const closed = await prisma.job.updateMany({
      where: {
        status: "active",
        autoRenew: false,
        expiresAt: { lte: now },
      },
      data: { status: "closed" },
    })
    closedCount = closed.count
  } catch (e) {
    errors.push(`close: ${e instanceof Error ? e.message : e}`)
  }

  console.info(
    `[cron/expire-jobs] renewed=${renewed}, closed=${closedCount}, errors=${errors.length}`
  )
  if (errors.length > 0) {
    console.error(`[cron/expire-jobs] errors: ${JSON.stringify(errors)}`)
  }

  return Response.json({
    ok: errors.length === 0,
    renewed,
    closed: closedCount,
    errors,
    timestamp: now.toISOString(),
  })
}

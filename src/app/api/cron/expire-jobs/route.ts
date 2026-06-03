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

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const AUTO_RENEW_EXTENSION_MS = 30 * 24 * 60 * 60 * 1000

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const now = new Date()

  // 1) 自動再掲載: expiresAt を +30 日延長
  const renewTarget = await prisma.job
    .findMany({
      where: {
        status: "active",
        autoRenew: true,
        expiresAt: { lte: now },
      },
      select: { id: true, expiresAt: true },
      take: 500,
    })
    .catch(() => [])

  let renewed = 0
  for (const j of renewTarget) {
    const newExpiry = new Date(
      (j.expiresAt?.getTime() ?? now.getTime()) + AUTO_RENEW_EXTENSION_MS
    )
    await prisma.job
      .update({
        where: { id: j.id },
        data: { expiresAt: newExpiry, publishedAt: now },
      })
      .then(() => {
        renewed++
      })
      .catch(() => null)
  }

  // 2) auto_renew でないものは closed に
  const closed = await prisma.job.updateMany({
    where: {
      status: "active",
      autoRenew: false,
      expiresAt: { lte: now },
    },
    data: { status: "closed" },
  })

  console.info(
    `[cron/expire-jobs] renewed=${renewed}, closed=${closed.count}`
  )

  return Response.json({
    renewed,
    closed: closed.count,
    timestamp: now.toISOString(),
  })
}

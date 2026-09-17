/**
 * スカウトメッセージの期限切れ自動処理。
 *
 * 毎日 03:15 UTC に Vercel Cron Jobs から呼び出す (vercel.json に登録)。
 * Authorization ヘッダーで CRON_SECRET を検証。
 *
 * 動作:
 *   status が sent/read のレコードで expires_at <= now() なら status="expired" に更新。
 *   declined / expired はスキップ。
 */

import { prisma } from "@/lib/db"
import { requireCronAuth } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET(request: Request) {
  const authError = requireCronAuth(request)
  if (authError) return authError

  const now = new Date()
  const result = await prisma.scoutMessage.updateMany({
    where: {
      status: { in: ["sent", "read"] },
      expiresAt: { lte: now },
    },
    data: { status: "expired" },
  })

  console.log(`[cron/expire-scouts] expired=${result.count}`)

  return Response.json({
    ok: true,
    expired: result.count,
    timestamp: now.toISOString(),
  })
}

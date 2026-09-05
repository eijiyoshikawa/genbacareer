import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { getGuestAccessibleJobIds, isCrawlerUserAgent } from "@/lib/guest-job-access"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { type NextRequest } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 求人詳細 API は 1 分 60 リクエスト / IP（スクレイピング対策）
  const rl = checkRateLimit({
    key: `job-detail:${getClientIp(request)}`,
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const { id } = await params

  // /jobs/[id] ページと同じ未登録ゲスト向けゲート（上位 GUEST_LIMIT 件のみ）を
  // ここでも強制する。このチェックが無いと `/api/jobs` 一覧から拾った ID を
  // 総当たりするだけで全求人の詳細（企業名・住所等含む）が取得できてしまう。
  const session = await auth().catch(() => null)
  if (!session?.user?.id && !isCrawlerUserAgent(request.headers.get("user-agent"))) {
    const allowedIds = await getGuestAccessibleJobIds()
    if (!allowedIds.includes(id)) {
      return Response.json({ error: "ログインが必要です" }, { status: 401 })
    }
  }

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          prefecture: true,
          city: true,
          address: true,
          employeeCount: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
        },
      },
    },
  })

  if (!job) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // 閲覧数をインクリメント（非同期、レスポンスをブロックしない）
  prisma.job
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  return Response.json(job)
}

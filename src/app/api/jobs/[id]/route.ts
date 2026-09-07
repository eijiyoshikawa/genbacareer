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

  // 未登録ゲストは /jobs/[id] ページと同じ「グローバル上位 GUEST_LIMIT 件」のみ閲覧可。
  // ここでガードしないと /jobs/[id] の遷移ゲートを経由せず直接 API を叩いて
  // 全求人の詳細を取得できてしまう。
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    const ua = request.headers.get("user-agent")
    if (!isCrawlerUserAgent(ua)) {
      const allowedIds = await getGuestAccessibleJobIds()
      if (!allowedIds.includes(id)) {
        return Response.json({ error: "ログインが必要です" }, { status: 401 })
      }
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

import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { isJobGuestAccessible } from "@/lib/guest-job-access"
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

  // /jobs/[id] ページと同じ未登録ゲストゲートをこの API にも適用する
  // （ゲート未適用のままだと、このエンドポイントを直接叩くだけで
  //   「未登録は上位 15 件まで」の制限を完全に回避できてしまう）。
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    const ua = request.headers.get("user-agent")
    const allowed = await isJobGuestAccessible(id, ua)
    if (!allowed) {
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

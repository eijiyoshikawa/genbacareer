import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { type NextRequest } from "next/server"
import { isValidUuid } from "@/lib/uuid"
import { auth } from "@/lib/auth"
import { getGuestJobIdLimit } from "@/lib/guest-job-access"

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

  if (!isValidUuid(id)) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  // 求人詳細ページと同じ未登録ゲート (未ログインは上位 15 件のみ)
  const session = await auth().catch(() => null)
  const guestLimit = await getGuestJobIdLimit({
    loggedIn: !!session?.user?.id,
    userAgent: request.headers.get("user-agent"),
  })
  if (guestLimit && !guestLimit.has(id)) {
    return Response.json(
      { error: "この求人の詳細を見るには会員登録 (無料) が必要です" },
      { status: 401 }
    )
  }

  // 公開 API なので掲載中 (active) のみ返し、社内項目は除外する。
  const job = await prisma.job.findFirst({
    where: { id, status: "active" },
    omit: {
      previewToken: true,
      hiringFeeAmount: true,
      // 取り込み元の生データ・内部の並び順スコアも外部には返さない
      rawData: true,
      dedupeKey: true,
      rankScore: true,
      displayPriority: true,
    },
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

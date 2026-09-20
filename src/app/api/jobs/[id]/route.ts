import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { getGuestAccessibleJobIds, isCrawlerUserAgent } from "@/lib/guest-job-access"
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

  // 未登録ゲストは /jobs/[id] ページと同じく「グローバル上位 GUEST_LIMIT 件」のみ閲覧可。
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

  // previewToken / hiringFeeAmount / rawData / dedupeKey 等の内部専用カラムを
  // レスポンスに含めないよう、公開して問題ないフィールドのみ select する。
  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      category: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      prefecture: true,
      city: true,
      address: true,
      benefits: true,
      tags: true,
      videoUrls: true,
      imageUrls: true,
      status: true,
      dedupedTo: true,
      source: true,
      publishedAt: true,
      expiresAt: true,
      validUntil: true,
      createdAt: true,
      viewCount: true,
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

  // 重複求人として close された場合、正規の求人 ID を案内する。
  if (job.dedupedTo) {
    return Response.json(
      { error: "求人が見つかりません", redirectTo: job.dedupedTo },
      { status: 404 }
    )
  }

  // 閲覧数をインクリメント（非同期、レスポンスをブロックしない）
  prisma.job
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  return Response.json(job)
}

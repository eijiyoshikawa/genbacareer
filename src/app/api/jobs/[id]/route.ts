import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import {
  getGuestAccessibleJobIds,
  isCrawlerUserAgent,
} from "@/lib/guest-job-access"
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

  // /jobs/[id] ページと同じ未登録ゲート: 上位 GUEST_LIMIT 件以外は非公開。
  // 検索エンジン等のクローラは Google for Jobs SEO 維持のため除外する。
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    const ua = request.headers.get("user-agent")
    if (!isCrawlerUserAgent(ua)) {
      const allowedIds = await getGuestAccessibleJobIds()
      if (!allowedIds.includes(id)) {
        return Response.json({ error: "求人が見つかりません" }, { status: 404 })
      }
    }
  }

  // previewToken / rawData / dedupeKey 等の内部専用カラムは含めない。
  const job = await prisma.job.findUnique({
    where: { id, status: "active" },
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
      status: true,
      source: true,
      publishedAt: true,
      expiresAt: true,
      validUntil: true,
      createdAt: true,
      occupationTitle: true,
      occupationCategoryName: true,
      jobTypeName: true,
      jobConditionNotes: true,
      baseSalary: true,
      bonus: true,
      commuteAllowance: true,
      workHours: true,
      workHoursNotes: true,
      holidays: true,
      holidaysOther: true,
      annualHolidays: true,
      insurance: true,
      smokingPolicy: true,
      trialPeriod: true,
      requiredExperience: true,
      education: true,
      recruitmentCount: true,
      recruitmentReason: true,
      companyFeatures: true,
      businessContent: true,
      companyUrl: true,
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

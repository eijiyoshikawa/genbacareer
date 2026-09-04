import { prisma } from "@/lib/db"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { getGuestAccessibleJobIds } from "@/lib/guest-job-access"
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

  // 求職者ログイン時のみ全件閲覧可。未ログインは /jobs 一覧と同じ GUEST_LIMIT 対象のみ。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  if (!loggedIn) {
    const allowedIds = await getGuestAccessibleJobIds()
    if (!allowedIds.includes(id)) {
      return Response.json({ error: "求人が見つかりません" }, { status: 404 })
    }
  }

  const job = await prisma.job.findUnique({
    where: { id, status: "active" },
    // hiringFeeAmount / previewToken / dedupeKey / rawData 等の内部専用フィールドは
    // 公開 API では返さない（/api/jobs 一覧の select 方針と揃える）。
    select: {
      id: true,
      title: true,
      description: true,
      requirements: true,
      category: true,
      subcategory: true,
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
      source: true,
      helloworkId: true,
      publishedAt: true,
      expiresAt: true,
      validUntil: true,
      createdAt: true,
      occupationTitle: true,
      occupationCategoryName: true,
      industryCode: true,
      jobTypeName: true,
      jobConditionNotes: true,
      baseSalary: true,
      bonus: true,
      commuteAllowance: true,
      fixedOvertime: true,
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

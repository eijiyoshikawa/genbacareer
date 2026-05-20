import { type NextRequest } from "next/server"
import { prisma } from "@/lib/db"
import { sendSavedSearchMatchEmail } from "@/lib/email"

/**
 * 保存検索条件に一致する新着求人をユーザーへメール通知する cron 用ルート。
 *
 * Vercel Cron や外部スケジューラから 1 時間〜1 日間隔で呼び出す想定。
 * 認証: Authorization: Bearer ${CRON_SECRET} ヘッダを必須にする。
 */
export const dynamic = "force-dynamic"

function authorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get("authorization") ?? ""
  return header === `Bearer ${secret}`
}

function baseUrl() {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXTAUTH_URL ??
    "http://localhost:3000"
  )
}

function buildJobsUrl(s: {
  prefecture: string | null
  category: string | null
  employmentType: string | null
  salaryMin: number | null
  keyword: string | null
}): string {
  const sp = new URLSearchParams()
  if (s.prefecture) sp.set("prefecture", s.prefecture)
  if (s.category) sp.set("category", s.category)
  if (s.employmentType) sp.set("employment_type", s.employmentType)
  if (s.salaryMin != null) sp.set("salary_min", String(s.salaryMin))
  if (s.keyword) sp.set("q", s.keyword)
  return `${baseUrl()}/jobs?${sp.toString()}`
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const searches = await prisma.savedSearch.findMany({
    where: { alertEnabled: true },
    include: {
      user: { select: { email: true, deletedAt: true } },
    },
  })

  let processed = 0
  let notified = 0
  const now = new Date()

  for (const s of searches) {
    if (!s.user || s.user.deletedAt || !s.user.email) continue
    processed += 1

    const since = s.lastNotifiedAt ?? new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const where = {
      status: "active",
      publishedAt: { gt: since },
      ...(s.prefecture ? { prefecture: s.prefecture } : {}),
      ...(s.category ? { category: s.category } : {}),
      ...(s.employmentType ? { employmentType: s.employmentType } : {}),
      ...(s.salaryMin != null ? { salaryMin: { gte: s.salaryMin } } : {}),
      ...(s.keyword
        ? {
            OR: [
              { title: { contains: s.keyword, mode: "insensitive" as const } },
              {
                description: {
                  contains: s.keyword,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
    }

    const count = await prisma.job.count({ where })

    if (count > 0) {
      try {
        await sendSavedSearchMatchEmail({
          to: s.user.email,
          searchName: s.name,
          matchCount: count,
          searchUrl: buildJobsUrl({
            prefecture: s.prefecture,
            category: s.category,
            employmentType: s.employmentType,
            salaryMin: s.salaryMin,
            keyword: s.keyword,
          }),
        })
        notified += 1
        await prisma.notification.create({
          data: {
            userId: s.userId,
            kind: "saved_search_match",
            title: `新着求人 ${count} 件`,
            body: `保存条件「${s.name}」に一致する新着求人があります`,
            linkUrl: "/jobs",
          },
        })
      } catch (err) {
        console.error("[cron/saved-search-alerts] email failed:", err)
      }
    }

    await prisma.savedSearch.update({
      where: { id: s.id },
      data: { lastNotifiedAt: now },
    })
  }

  return Response.json({ processed, notified })
}

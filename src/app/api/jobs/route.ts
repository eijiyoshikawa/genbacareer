import { prisma } from "@/lib/db"
import {
  CONSTRUCTION_CATEGORY_VALUES,
  isConstructionCategory,
} from "@/lib/categories"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import { type NextRequest } from "next/server"

export async function GET(request: NextRequest) {
  // スクレイピング対策: 公開求人検索 API は 1 分 90 リクエスト / IP
  const rl = checkRateLimit({
    key: `jobs-list:${getClientIp(request)}`,
    limit: 90,
    windowMs: 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const searchParams = request.nextUrl.searchParams

  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件 + page=1 固定。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id

  const prefecture = searchParams.get("prefecture")
  const category = searchParams.get("category")
  const employmentType = searchParams.get("employment_type")
  const salaryMinRaw = searchParams.get("salary_min")
  const salaryMin = salaryMinRaw && Number.isFinite(Number(salaryMinRaw)) ? Number(salaryMinRaw) : null
  const qRaw = searchParams.get("q")
  const q = qRaw ? qRaw.slice(0, 200) : null
  const rawPage = Math.max(1, Number(searchParams.get("page") ?? "1"))
  const rawLimit = Math.min(
    50,
    Math.max(1, Number(searchParams.get("limit") ?? "20")),
  )
  const page = loggedIn ? rawPage : 1
  const limit = loggedIn ? rawLimit : Math.min(rawLimit, GUEST_LIMIT)
  const sort = searchParams.get("sort") ?? "published_at"

  // 建設業特化サイトのため、非建設業カテゴリは常に除外する。
  // ユーザーが ?category= を指定した場合も建設業カテゴリ以外は無効化。
  const categoryFilter =
    category && isConstructionCategory(category)
      ? { category }
      : { category: { in: [...CONSTRUCTION_CATEGORY_VALUES] } }

  const where = {
    status: "active" as const,
    ...(prefecture && { prefecture }),
    ...categoryFilter,
    ...(employmentType && { employmentType }),
    ...(salaryMin !== null && { salaryMin: { gte: salaryMin } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
      ],
    }),
  }

  const orderBy =
    sort === "salary_max"
      ? { salaryMax: "desc" as const }
      : sort === "view_count"
        ? { viewCount: "desc" as const }
        : sort === "newest"
          ? { publishedAt: "desc" as const }
          : // default: recommended (rankScore)
            [
              { rankScore: "desc" as const },
              { publishedAt: "desc" as const },
            ]

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        subcategory: true,
        employmentType: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        prefecture: true,
        city: true,
        tags: true,
        source: true,
        publishedAt: true,
        company: {
          select: { id: true, name: true, logoUrl: true },
        },
      },
    }),
    prisma.job.count({ where }),
  ])

  return Response.json({
    jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  })
}

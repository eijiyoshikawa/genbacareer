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
import {
  buildPublicJobOrderBy,
  type PublicJobSort,
} from "@/lib/job-sort"
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
  const salaryMin = searchParams.get("salary_min")
  const q = searchParams.get("q")
  // 数値以外 / 小数が来ると take・skip が NaN になり Prisma が 500 を返すため
  // 整数化して既定値へフォールバックする。
  const toInt = (v: string | null, fallback: number) => {
    const n = Number.parseInt(v ?? "", 10)
    return Number.isFinite(n) ? n : fallback
  }
  const rawPage = Math.min(10000, Math.max(1, toInt(searchParams.get("page"), 1)))
  const rawLimit = Math.min(50, Math.max(1, toInt(searchParams.get("limit"), 20)))
  const salaryMinNum = Number.parseInt(salaryMin ?? "", 10)
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
    ...(Number.isFinite(salaryMinNum) &&
      salaryMinNum > 0 &&
      salaryMinNum <= 2_000_000_000 && { salaryMin: { gte: salaryMinNum } }),
    ...(q && {
      OR: [
        { title: { contains: q, mode: "insensitive" as const } },
        { description: { contains: q, mode: "insensitive" as const } },
        { company: { is: { name: { contains: q, mode: "insensitive" as const } } } },
      ],
    }),
  }

  // Job.displayPriority を主キーとした統一ソート（src/lib/job-sort.ts 参照）。
  // 公開 API のソートパラメタを内部の PublicJobSort に正規化する。
  const normalizedSort: PublicJobSort =
    sort === "salary_max"
      ? "salary_high"
      : sort === "view_count"
        ? "popular"
        : sort === "newest"
          ? "newest"
          : "recommended"
  const orderBy = buildPublicJobOrderBy(normalizedSort)

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

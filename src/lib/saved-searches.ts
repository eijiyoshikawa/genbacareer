/**
 * SavedSearch の where 句変換 + マッチング処理。
 *
 * /jobs のフィルタとセマンティクスを揃え、SavedSearch を Prisma の where に
 * 変換して新着求人を検索する。
 */

import { prisma } from "@/lib/db"
import {
  CONSTRUCTION_CATEGORY_VALUES,
  isConstructionCategory,
} from "@/lib/categories"

export type SavedSearchInput = {
  q?: string | null
  prefecture?: string | null
  city?: string | null
  category?: string | null
  employmentType?: string | null
  salaryMin?: number | null
  source?: string | null
  tags?: string[] | null
  excludeKeywords?: string[] | null
}

export function buildJobWhere(input: SavedSearchInput, since?: Date) {
  const categoryFilter =
    input.category && isConstructionCategory(input.category)
      ? { category: input.category }
      : { category: { in: [...CONSTRUCTION_CATEGORY_VALUES] } }

  // 除外キーワード: title / description のどちらにも含まれていない（AND NOT）
  const excludeFilters = (input.excludeKeywords ?? []).filter(Boolean).map(
    (kw) => ({
      AND: [
        { title: { not: { contains: kw, mode: "insensitive" as const } } },
        {
          OR: [
            { description: null },
            {
              description: {
                not: { contains: kw, mode: "insensitive" as const },
              },
            },
          ],
        },
      ],
    })
  )

  return {
    status: "active" as const,
    ...categoryFilter,
    ...(input.prefecture ? { prefecture: input.prefecture } : {}),
    ...(input.city ? { city: input.city } : {}),
    ...(input.employmentType
      ? { employmentType: input.employmentType }
      : {}),
    ...(input.salaryMin
      ? { salaryMin: { gte: input.salaryMin } }
      : {}),
    ...(input.source ? { source: input.source } : {}),
    ...(input.tags && input.tags.length > 0
      ? { tags: { hasSome: input.tags } }
      : {}),
    ...(input.q
      ? {
          OR: [
            { title: { contains: input.q, mode: "insensitive" as const } },
            {
              description: { contains: input.q, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
    ...(excludeFilters.length > 0 ? { AND: excludeFilters } : {}),
    ...(since ? { publishedAt: { gte: since } } : {}),
  }
}

/**
 * 保存検索の条件を URL クエリ文字列に変換（/jobs?q=... 形式）。
 */
export function toSearchQueryString(input: SavedSearchInput): string {
  const params = new URLSearchParams()
  if (input.q) params.set("q", input.q)
  if (input.prefecture) params.set("prefecture", input.prefecture)
  if (input.city) params.set("city", input.city)
  if (input.category) params.set("category", input.category)
  if (input.employmentType)
    params.set("employment_type", input.employmentType)
  if (input.salaryMin) params.set("salary_min", String(input.salaryMin / 10000))
  if (input.source) params.set("source", input.source)
  if (input.tags && input.tags.length > 0) params.set("tags", input.tags.join(","))
  return params.toString()
}

/**
 * SavedSearch を人間向けラベルに整形（一覧表示用）。
 */
export function formatSearchLabel(input: SavedSearchInput): string {
  const parts: string[] = []
  if (input.prefecture) parts.push(input.prefecture)
  if (input.city) parts.push(input.city)
  if (input.category) parts.push(input.category)
  if (input.q) parts.push(`「${input.q}」`)
  if (input.salaryMin)
    parts.push(`${(input.salaryMin / 10000).toFixed(0)} 万円〜`)
  if (input.employmentType) {
    const lbl: Record<string, string> = {
      full_time: "正社員",
      part_time: "パート",
      contract: "契約",
    }
    parts.push(lbl[input.employmentType] ?? input.employmentType)
  }
  if (input.source === "direct") parts.push("認定企業のみ")
  if (input.source === "hellowork") parts.push("HW のみ")
  if (input.tags && input.tags.length > 0)
    parts.push(`#${input.tags.join(" #")}`)
  if (input.excludeKeywords && input.excludeKeywords.length > 0)
    parts.push(`除外: ${input.excludeKeywords.join(", ")}`)
  return parts.length > 0 ? parts.join(" / ") : "すべての建設業求人"
}

/**
 * 1 件の SavedSearch について、最後の通知時刻以降に公開された新着求人を取得。
 */
export async function findNewMatchingJobs(
  search: {
    q: string | null
    prefecture: string | null
    city: string | null
    category: string | null
    employmentType: string | null
    salaryMin: number | null
    source: string | null
    tags?: string[]
    excludeKeywords?: string[]
    lastNotifiedAt: Date | null
    createdAt: Date
  },
  limit = 5
): Promise<
  Array<{
    id: string
    title: string
    prefecture: string
    publishedAt: Date | null
  }>
> {
  const since = search.lastNotifiedAt ?? search.createdAt
  const where = buildJobWhere(search, since)

  return prisma.job
    .findMany({
      where,
      orderBy: { publishedAt: "desc" },
      take: limit,
      select: { id: true, title: true, prefecture: true, publishedAt: true },
    })
    .catch(() => [])
}

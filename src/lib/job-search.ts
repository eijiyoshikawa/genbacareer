/**
 * pg_trgm を使った求人のあいまい検索。
 *
 * 通常の Prisma where（ILIKE）では「型枠だいく」「コンクリ」みたいな
 * 部分一致 / 表記揺れに弱い。pg_trgm の similarity() 関数で類似度を
 * 数値化して並べると、検索品質が大幅に上がる。
 *
 * 拡張未導入の DB 環境では try/catch でフォールバックする。
 */

import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES, isConstructionCategory } from "@/lib/categories"

export type FuzzySearchInput = {
  q: string
  prefecture?: string
  city?: string
  category?: string
  employmentType?: string
  source?: string
  salaryMin?: number
  salaryMax?: number
  publishedSince?: Date
  limit?: number
  offset?: number
}

export type FuzzySearchRow = {
  id: string
  similarity: number
}

export type FuzzySearchResult = {
  ids: string[]
  total: number
}

/**
 * 求人 ID（類似度順、offset/limit 適用済み）と、しきい値を超える
 * 全体のマッチ件数を返す。結果の整形（JobCard 用 include）は
 * 呼び出し側で findMany し直すこと。
 *
 * pg_trgm 拡張が無いと SQL エラーになるので、その場合は null を返す
 * （呼び出し側で ILIKE 等にフォールバック判断）。
 */
export async function fuzzySearchJobs(
  input: FuzzySearchInput
): Promise<FuzzySearchResult | null> {
  if (!input.q.trim()) return null
  const limit = Math.min(100, Math.max(1, input.limit ?? 50))
  const offset = Math.max(0, input.offset ?? 0)

  const categories =
    input.category && isConstructionCategory(input.category)
      ? [input.category]
      : [...CONSTRUCTION_CATEGORY_VALUES]

  // raw query で similarity を計算しつつ where もまとめる。
  // - title と description それぞれの類似度の最大値を採用
  // - 0.05 以上を閾値（ある程度関連がある）
  // - 同点は publishedAt DESC
  try {
    const params: unknown[] = [input.q, categories]
    const filterClauses: string[] = []
    const pushFilter = (column: string, value: unknown) => {
      params.push(value)
      filterClauses.push(`AND ${column} = $${params.length}`)
    }

    if (input.prefecture) pushFilter("prefecture", input.prefecture)
    if (input.employmentType) pushFilter("employment_type", input.employmentType)
    if (input.source) pushFilter("source", input.source)
    if (input.publishedSince) {
      params.push(input.publishedSince)
      filterClauses.push(`AND published_at >= $${params.length}`)
    }
    if (input.salaryMin) {
      params.push(input.salaryMin)
      filterClauses.push(`AND salary_min >= $${params.length}`)
    }
    if (input.salaryMax) {
      params.push(input.salaryMax)
      filterClauses.push(`AND salary_max <= $${params.length}`)
    }

    const scoredCte = `
      WITH scored AS (
        SELECT id,
               GREATEST(
                 similarity(title, $1),
                 similarity(coalesce(description, ''), $1)
               ) AS similarity,
               published_at
        FROM jobs
        WHERE status = 'active'
          AND category = ANY($2)
          ${filterClauses.join("\n          ")}
      )
    `

    const [rows, countRows] = await Promise.all([
      prisma.$queryRawUnsafe<{ id: string; similarity: number }[]>(
        `${scoredCte}
        SELECT id, similarity
        FROM scored
        WHERE similarity > 0.05
        ORDER BY similarity DESC, published_at DESC NULLS LAST
        LIMIT ${limit} OFFSET ${offset};
        `,
        ...params
      ),
      prisma.$queryRawUnsafe<{ count: bigint }[]>(
        `${scoredCte}
        SELECT COUNT(*)::bigint AS count
        FROM scored
        WHERE similarity > 0.05;
        `,
        ...params
      ),
    ])

    return {
      ids: rows.map((r) => r.id),
      total: Number(countRows[0]?.count ?? 0),
    }
  } catch (e) {
    console.warn(
      `[job-search] pg_trgm fuzzy search failed (falling back): ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

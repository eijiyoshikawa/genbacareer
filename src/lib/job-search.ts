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

/**
 * 求人 ID と類似度スコアを返す（最大 limit 件）。
 * 結果の整形（JobCard 用 include）は呼び出し側で findMany し直すこと。
 *
 * pg_trgm 拡張が無いと SQL エラーになるので、その場合は空配列を返す
 * （呼び出し側で ILIKE 等にフォールバック判断）。
 */
export async function fuzzySearchJobs(
  input: FuzzySearchInput
): Promise<FuzzySearchRow[] | null> {
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
  //
  // NOTE: $queryRawUnsafe のパラメータ番号は連続している必要があるため、
  // 動的に条件を追加しながら番号も追跡する。
  const params: unknown[] = [input.q, categories]
  const dynamicClauses: string[] = []

  if (input.prefecture) {
    params.push(input.prefecture)
    dynamicClauses.push(`prefecture = $${params.length}`)
  }
  if (input.employmentType) {
    params.push(input.employmentType)
    dynamicClauses.push(`employment_type = $${params.length}`)
  }
  if (input.source) {
    params.push(input.source)
    dynamicClauses.push(`source = $${params.length}`)
  }
  if (input.publishedSince) {
    params.push(input.publishedSince)
    dynamicClauses.push(`published_at >= $${params.length}`)
  }
  if (input.salaryMin) {
    params.push(input.salaryMin)
    dynamicClauses.push(`salary_min >= $${params.length}`)
  }
  if (input.salaryMax) {
    params.push(input.salaryMax)
    dynamicClauses.push(`salary_max <= $${params.length}`)
  }

  const extraWhere =
    dynamicClauses.length > 0
      ? dynamicClauses.map((c) => `AND ${c}`).join("\n          ")
      : ""

  try {
    const rows = await prisma.$queryRawUnsafe<
      { id: string; similarity: number }[]
    >(
      `
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
          ${extraWhere}
      )
      SELECT id, similarity
      FROM scored
      WHERE similarity > 0.05
      ORDER BY similarity DESC, published_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset};
      `,
      ...params
    )
    return rows
  } catch (e) {
    console.warn(
      `[job-search] pg_trgm fuzzy search failed (falling back): ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

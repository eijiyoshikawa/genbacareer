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
  // プレースホルダ番号は values 配列と同じ順序で動的に採番する。
  // (固定番号 $3, $4... と値配列の位置がフィルタの有無でズレる
  //  バグが過去にあったため、番号と値を必ずペアで push すること)
  const values: unknown[] = [input.q, categories]
  const conditions: string[] = []
  const pushCondition = (sql: string, value: unknown) => {
    values.push(value)
    conditions.push(`${sql} $${values.length}`)
  }
  if (input.prefecture) pushCondition("AND prefecture =", input.prefecture)
  if (input.employmentType) pushCondition("AND employment_type =", input.employmentType)
  if (input.source) pushCondition("AND source =", input.source)
  if (input.publishedSince) pushCondition("AND published_at >=", input.publishedSince)
  if (input.salaryMin) pushCondition("AND salary_min >=", input.salaryMin)
  if (input.salaryMax) pushCondition("AND salary_max <=", input.salaryMax)

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
          ${conditions.join("\n          ")}
      )
      SELECT id, similarity
      FROM scored
      WHERE similarity > 0.05
      ORDER BY similarity DESC, published_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset};
      `,
      ...values
    )
    return rows
  } catch (e) {
    console.warn(
      `[job-search] pg_trgm fuzzy search failed (falling back): ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

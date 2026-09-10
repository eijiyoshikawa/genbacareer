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
  /** 17.3 ブロック企業除外（NOT IN 相当） */
  excludeCompanyIds?: string[]
  /** 17.3 NG キーワード除外（title/description いずれにも含まれない） */
  excludeKeywords?: string[]
  limit?: number
  offset?: number
}

export type FuzzySearchRow = {
  id: string
  similarity: number
}

/**
 * fuzzySearchJobs / countFuzzyMatches で共有する WHERE 句 + パラメータ列を組み立てる。
 * 呼び出し側は $1 = 検索語, $2 = カテゴリ配列 として先頭 2 つを予約済みの前提で使う。
 */
function buildFuzzyWhereClause(input: FuzzySearchInput): {
  sql: string
  params: unknown[]
} {
  const categories =
    input.category && isConstructionCategory(input.category)
      ? [input.category]
      : [...CONSTRUCTION_CATEGORY_VALUES]

  const conditions = ["status = 'active'", "category = ANY($2)"]
  const params: unknown[] = [input.q, categories]

  // 1 パラメータだけを使う単純な条件を追加するヘルパー。
  // 複数回 $N を参照する条件（キーワード除外）はこれを使わず個別に組み立てる。
  const pushSimple = (condition: string, value: unknown) => {
    params.push(value)
    conditions.push(condition.replace("$N", `$${params.length}`))
  }

  if (input.prefecture) pushSimple("prefecture = $N", input.prefecture)
  if (input.employmentType) pushSimple("employment_type = $N", input.employmentType)
  if (input.source) pushSimple("source = $N", input.source)
  if (input.publishedSince) pushSimple("published_at >= $N", input.publishedSince)
  if (input.salaryMin) pushSimple("salary_min >= $N", input.salaryMin)
  if (input.salaryMax) pushSimple("salary_max <= $N", input.salaryMax)
  if (input.excludeCompanyIds && input.excludeCompanyIds.length > 0) {
    pushSimple(
      "(company_id IS NULL OR NOT (company_id = ANY($N::uuid[])))",
      input.excludeCompanyIds
    )
  }
  if (input.excludeKeywords && input.excludeKeywords.length > 0) {
    params.push(input.excludeKeywords.map((kw) => `%${kw}%`))
    const p = params.length
    conditions.push(
      `NOT (title ILIKE ANY($${p}) OR COALESCE(description, '') ILIKE ANY($${p}))`
    )
  }

  return { sql: conditions.join(" AND "), params }
}

/**
 * 求人 ID と類似度スコアを返す（最大 limit 件、offset 起点で正しくページング済み）。
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
  const { sql: whereSql, params } = buildFuzzyWhereClause(input)

  // raw query で similarity を計算しつつ where もまとめる。
  // - title と description それぞれの類似度の最大値を採用
  // - 0.05 以上を閾値（ある程度関連がある）
  // - 同点は publishedAt DESC
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
        WHERE ${whereSql}
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

/**
 * fuzzySearchJobs と同じ条件に一致する総件数を返す（ページング UI の
 * 総ページ数計算用）。
 *
 * fuzzySearchJobs は 1 ページ分（最大 100 件）しか返さないため、
 * これを使わずに「取得できた件数」を総件数として扱うと、100 件を超える
 * 一致がある人気キーワードで総件数を過小評価し、実際には存在する
 * 後続ページに永遠に到達できなくなる。
 */
export async function countFuzzyMatches(
  input: FuzzySearchInput
): Promise<number | null> {
  if (!input.q.trim()) return null
  const { sql: whereSql, params } = buildFuzzyWhereClause(input)

  try {
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `
      WITH scored AS (
        SELECT GREATEST(
                 similarity(title, $1),
                 similarity(coalesce(description, ''), $1)
               ) AS similarity
        FROM jobs
        WHERE ${whereSql}
      )
      SELECT COUNT(*)::bigint AS count
      FROM scored
      WHERE similarity > 0.05;
      `,
      ...params
    )
    return Number(rows[0]?.count ?? 0)
  } catch (e) {
    console.warn(
      `[job-search] pg_trgm fuzzy count failed (falling back): ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

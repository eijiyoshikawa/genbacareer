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
  /** SNS・動画(videoUrls)の有無で絞り込む。true=ありのみ / false=なしのみ / 未指定=絞らない */
  hasVideo?: boolean
  limit?: number
  offset?: number
}

export type FuzzySearchRow = {
  id: string
  similarity: number
}

// where句と params の組み立ては件数取得(count)と本検索(search)で共有する。
function buildFuzzyWhere(input: FuzzySearchInput): {
  whereSql: string
  params: unknown[]
} {
  const categories =
    input.category && isConstructionCategory(input.category)
      ? [input.category]
      : [...CONSTRUCTION_CATEGORY_VALUES]

  // NOTE: $N の位置はオプションフィルタの有無で変わるため動的に採番する。
  // （静的に $3..$8 と書くと、prefecture 無しで employmentType 等を指定したとき
  //   実際の引数位置とずれて SQL エラーになり、ファジー検索が無音で失敗していた）
  const params: unknown[] = [input.q, categories]
  let n = 2
  const whereClauses: string[] = []
  if (input.prefecture) {
    whereClauses.push(`AND prefecture = $${++n}`)
    params.push(input.prefecture)
  }
  if (input.employmentType) {
    whereClauses.push(`AND employment_type = $${++n}`)
    params.push(input.employmentType)
  }
  if (input.source) {
    whereClauses.push(`AND source = $${++n}`)
    params.push(input.source)
  }
  if (input.publishedSince) {
    whereClauses.push(`AND published_at >= $${++n}`)
    params.push(input.publishedSince)
  }
  if (input.salaryMin) {
    whereClauses.push(`AND salary_min >= $${++n}`)
    params.push(input.salaryMin)
  }
  if (input.salaryMax) {
    whereClauses.push(`AND salary_max <= $${++n}`)
    params.push(input.salaryMax)
  }
  // hasVideo はパラメータ不要のインライン条件
  if (input.hasVideo === true) {
    whereClauses.push("AND coalesce(array_length(video_urls, 1), 0) > 0")
  } else if (input.hasVideo === false) {
    whereClauses.push("AND coalesce(array_length(video_urls, 1), 0) = 0")
  }

  return { whereSql: whereClauses.join("\n          "), params }
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

  // raw query で similarity を計算しつつ where もまとめる。
  // - title と description それぞれの類似度の最大値を採用
  // - 0.05 以上を閾値（ある程度関連がある）
  // - 同点は publishedAt DESC
  try {
    const { whereSql, params } = buildFuzzyWhere(input)

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
          ${whereSql}
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
 * fuzzySearchJobs と同じ条件に一致する総件数を返す（ページング用）。
 * fuzzySearchJobs 自体は LIMIT で最大 100 件しか返さないため、
 * 呼び出し側が `rows.length` を総件数として使うと、実際のヒット件数が
 * 100 件を超える人気キーワードで検索結果数・ページ数を過小表示してしまう。
 */
export async function fuzzySearchJobsCount(
  input: FuzzySearchInput
): Promise<number | null> {
  if (!input.q.trim()) return null
  try {
    const { whereSql, params } = buildFuzzyWhere(input)
    const rows = await prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `
      WITH scored AS (
        SELECT GREATEST(
                 similarity(title, $1),
                 similarity(coalesce(description, ''), $1)
               ) AS similarity
        FROM jobs
        WHERE status = 'active'
          AND category = ANY($2)
          ${whereSql}
      )
      SELECT count(*)::bigint AS count
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

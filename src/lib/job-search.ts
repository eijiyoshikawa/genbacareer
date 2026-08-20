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
  /** 17.3 ブロック企業。該当企業の求人を除外する */
  excludeCompanyIds?: string[]
  /** 17.3 NG キーワード。title / description のいずれかに含まれる求人を除外する */
  excludeKeywords?: string[]
  limit?: number
  offset?: number
}

export type FuzzySearchRow = {
  id: string
  similarity: number
}

/** 1 回のクエリで返す最大件数。総件数は countFuzzySearchJobs で別途数える。 */
const MAX_FUZZY_LIMIT = 100

/** 類似度の下限。これ未満は無関係とみなす。検索本体と件数で必ず揃えること。 */
const SIMILARITY_THRESHOLD = 0.05

/**
 * 検索本体と件数カウントで共有する WHERE 句を組み立てる。
 *
 * NOTE: $N の位置はオプションフィルタの有無で変わるため動的に採番する。
 * （静的に $3..$8 と書くと、prefecture 無しで employmentType 等を指定したとき
 *   実際の引数位置とずれて SQL エラーになり、ファジー検索が無音で失敗していた）
 */
function buildFuzzyWhere(input: FuzzySearchInput): {
  params: unknown[]
  whereSql: string
} {
  const categories =
    input.category && isConstructionCategory(input.category)
      ? [input.category]
      : [...CONSTRUCTION_CATEGORY_VALUES]

  const params: unknown[] = [input.q, categories]
  let n = 2
  const whereClauses: string[] = []

  if (input.prefecture) {
    whereClauses.push(`AND prefecture = $${++n}`)
    params.push(input.prefecture)
  }
  // city は FuzzySearchInput に宣言され呼び出し側も渡していたが、
  // SQL に条件が無く黙って捨てられていた（市区町村で絞ってもヒットしない）。
  if (input.city) {
    whereClauses.push(`AND city = $${++n}`)
    params.push(input.city)
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
  // 17.3 ブロック企業 / NG キーワード。fuzzy 経路では未適用で、
  // キーワード検索した途端にブロック中の企業の求人が再び出ていた。
  // company_id は nullable のため NULL を取りこぼさないようにする。
  if (input.excludeCompanyIds && input.excludeCompanyIds.length > 0) {
    whereClauses.push(
      `AND (company_id IS NULL OR company_id <> ALL($${++n}::uuid[]))`
    )
    params.push(input.excludeCompanyIds)
  }
  if (input.excludeKeywords && input.excludeKeywords.length > 0) {
    whereClauses.push(
      `AND NOT EXISTS (
           SELECT 1 FROM unnest($${++n}::text[]) AS kw
           WHERE title ILIKE '%' || kw || '%'
              OR coalesce(description, '') ILIKE '%' || kw || '%'
         )`
    )
    params.push(input.excludeKeywords)
  }
  // hasVideo はパラメータ不要のインライン条件
  if (input.hasVideo === true) {
    whereClauses.push("AND coalesce(array_length(video_urls, 1), 0) > 0")
  } else if (input.hasVideo === false) {
    whereClauses.push("AND coalesce(array_length(video_urls, 1), 0) = 0")
  }

  return { params, whereSql: whereClauses.join("\n          ") }
}

/**
 * 検索本体と同じ条件でヒット総数を返す。ページャと「N 件」表示に使う。
 *
 * これが無いと呼び出し側は取得済み ID 数を総件数と誤認し、
 * LIMIT (最大 100) がそのまま「100 件」と表示され、
 * それ以降のページが空になる。
 *
 * 失敗時は null（呼び出し側で取得件数にフォールバック）。
 */
export async function countFuzzySearchJobs(
  input: FuzzySearchInput
): Promise<number | null> {
  if (!input.q.trim()) return null
  try {
    const { params, whereSql } = buildFuzzyWhere(input)
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
      WHERE similarity > ${SIMILARITY_THRESHOLD};
      `,
      ...params
    )
    return rows[0] ? Number(rows[0].count) : 0
  } catch (e) {
    console.warn(
      `[job-search] fuzzy count failed: ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

/**
 * 求人 ID と類似度スコアを返す（最大 limit 件）。
 * 結果の整形（JobCard 用 include）は呼び出し側で findMany し直すこと。
 *
 * ORDER BY の末尾の id は同順位の決定打。similarity と published_at が
 * 完全に並ぶ求人（クローラの一括取込は published_at が秒まで同一になる）が
 * あると LIMIT/OFFSET の並びが不定になり、ページを跨いで同じ求人が重複したり
 * 抜け落ちたりする。
 *
 * pg_trgm 拡張が無いと SQL エラーになるので、その場合は空配列を返す
 * （呼び出し側で ILIKE 等にフォールバック判断）。
 */
export async function fuzzySearchJobs(
  input: FuzzySearchInput
): Promise<FuzzySearchRow[] | null> {
  if (!input.q.trim()) return null
  const limit = Math.min(MAX_FUZZY_LIMIT, Math.max(1, input.limit ?? 50))
  const offset = Math.max(0, input.offset ?? 0)

  // raw query で similarity を計算しつつ where もまとめる。
  // - title と description それぞれの類似度の最大値を採用
  // - 0.05 以上を閾値（ある程度関連がある）
  // - 同点は publishedAt DESC
  try {
    const { params, whereSql } = buildFuzzyWhere(input)
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
      WHERE similarity > ${SIMILARITY_THRESHOLD}
      ORDER BY similarity DESC, published_at DESC NULLS LAST, id
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

/**
 * pg_trgm を使った求人のあいまい検索。
 *
 * 通常の Prisma where（ILIKE）では「型枠だいく」「コンクリ」みたいな
 * 部分一致 / 表記揺れに弱い。pg_trgm の similarity() 関数で類似度を
 * 数値化して並べると、検索品質が大幅に上がる。
 *
 * 拡張未導入の DB 環境では try/catch でフォールバックする。
 */

import { noteDbError, prisma } from "@/lib/db"
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
  // 市区町村。未適用だと「八王子市」で絞っているのに都道府県全体の
  // 結果・件数が返り、並び順を変えると (Prisma 経路) 結果が変わっていた。
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
  // hasVideo はパラメータ不要のインライン条件
  if (input.hasVideo === true) {
    whereClauses.push("AND coalesce(array_length(video_urls, 1), 0) > 0")
  } else if (input.hasVideo === false) {
    whereClauses.push("AND coalesce(array_length(video_urls, 1), 0) = 0")
  }

  return { whereSql: whereClauses.join("\n          "), params }
}

/**
 * fuzzySearchJobsPage と同じ条件に一致する総件数だけを返す。
 * 範囲外のページを開いたとき (行が 0 件で総件数が分からないとき) に使う。
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
    // 接続枯渇はフォールバックしない (理由は fuzzySearchJobsPage を参照)
    if (noteDbError(e)) throw e
    console.warn(
      `[job-search] pg_trgm fuzzy count failed (falling back): ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

/**
 * 1 ページ分の求人 ID と総件数を 1 回の走査で返す。
 *
 * 類似度は全掲載求人の title / description に対して計算するためインデックスが
 * 効かず、このサイトで最も重いクエリになる。以前は「ページ取得」と「件数取得」を
 * 別々の SQL で並列に流しており、同じ全件走査を 2 本同時に走らせていた。
 * キーワード検索がまとめて来ると接続を使い切る原因になるため、
 * count(*) OVER() で件数を同じ走査から得る。
 *
 * 戻り値:
 *  - null: pg_trgm が使えない等で失敗 (呼び出し側は ILIKE にフォールバックする)
 *  - 接続枯渇 (P2024 / ECHECKOUTTIMEOUT) の場合は null を返さず throw する。
 *    フォールバックの ILIKE も同じく全件走査で、枯渇の最中にもう 1 本重い
 *    クエリを足すことになるため。
 */
export async function fuzzySearchJobsPage(
  input: FuzzySearchInput
): Promise<{ ids: string[]; total: number } | null> {
  if (!input.q.trim()) return null
  const limit = Math.min(100, Math.max(1, input.limit ?? 50))
  const offset = Math.max(0, input.offset ?? 0)
  try {
    const { whereSql, params } = buildFuzzyWhere(input)
    const rows = await prisma.$queryRawUnsafe<
      { id: string; total: bigint }[]
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
      SELECT id, count(*) OVER() AS total
      FROM scored
      WHERE similarity > 0.05
      ORDER BY similarity DESC, published_at DESC NULLS LAST
      LIMIT ${limit} OFFSET ${offset};
      `,
      ...params
    )
    if (rows.length > 0) {
      return { ids: rows.map((r) => r.id), total: Number(rows[0].total) }
    }
    // 0 行: 先頭ページなら本当に 0 件。2 ページ目以降は範囲外の可能性があるので
    // 件数だけ数え直す (ページ送りの表示に必要。ログイン中のみ到達する稀な経路)。
    if (offset === 0) return { ids: [], total: 0 }
    const total = await fuzzySearchJobsCount(input)
    return total === null ? null : { ids: [], total }
  } catch (e) {
    if (noteDbError(e)) throw e
    console.warn(
      `[job-search] pg_trgm fuzzy search failed (falling back): ${e instanceof Error ? e.message : e}`
    )
    return null
  }
}

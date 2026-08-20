/**
 * 公開求人一覧の表示順を組み立てる共通ヘルパー。
 *
 * すべての公開 API・ページで `Job.displayPriority` を主キーとし、
 * その後に各ソートモード固有のキーを並べる。これにより
 *   Tier 1 (direct) → Tier 2 (月給完全) → Tier 3 (月給不完全) →
 *   Tier 4 (時給/日給) → Tier 5 (その他)
 * の順序を全画面で統一する。
 *
 * 適用箇所:
 *   - /jobs               (page.tsx の buildOrderBy)
 *   - /api/jobs           (公開検索 API)
 *   - /jobs/feed          (スワイプ求人)
 *   - /api/jobs/feed      (フィード API)
 *   - /api/jobs/suggest   (おすすめ API)
 *   - / (top page)         (ホームのセクション表示)
 *   - /salary, /employment-type, /journal などの一覧
 *
 * 適用外（意図的に displayPriority を入れない）:
 *   - admin / company ダッシュボードの自社求人一覧（編集都合の時系列）
 *   - 重複排除 / 分析用クエリ（内部処理）
 */

import type { Prisma } from "@prisma/client"

export type PublicJobSort =
  | "recommended"
  | "newest"
  | "salary_high"
  | "salary_low"
  | "popular"

const DISPLAY_PRIORITY_ASC = { displayPriority: "asc" as const }

// salaryMin / publishedAt はいずれも nullable。Postgres の DESC は既定で
// NULLS FIRST のため、明示しないと「給与が高い順」の先頭が給与非公開の求人に、
// 「新着順」の先頭が公開日なしの求人になる。降順では常に NULL を末尾に送る。
// (ASC は既定で NULLS LAST なので昇順は指定不要だが、意図を明示するため揃える)
const SALARY_MIN_DESC = {
  salaryMin: { sort: "desc", nulls: "last" },
} as const
const SALARY_MIN_ASC = {
  salaryMin: { sort: "asc", nulls: "last" },
} as const
const PUBLISHED_AT_DESC = {
  publishedAt: { sort: "desc", nulls: "last" },
} as const

export function buildPublicJobOrderBy(
  sort: PublicJobSort,
  options: { includeCompanyTier?: boolean } = {}
): Prisma.JobOrderByWithRelationInput[] {
  const { includeCompanyTier = false } = options

  const tail: Prisma.JobOrderByWithRelationInput[] = (() => {
    switch (sort) {
      case "salary_high":
        return [SALARY_MIN_DESC, PUBLISHED_AT_DESC]
      case "salary_low":
        return [SALARY_MIN_ASC, PUBLISHED_AT_DESC]
      case "popular":
        return [{ viewCount: "desc" }, PUBLISHED_AT_DESC]
      case "newest":
        return [PUBLISHED_AT_DESC]
      case "recommended":
      default:
        if (includeCompanyTier) {
          // /jobs ページの recommended のみ、企業プランによるローテーションを噛ませる。
          // /api 系の単純呼び出しでは省略して軽量化。
          return [
            { company: { planTier: "desc" } },
            { company: { rotationKey: "asc" } },
            { rankScore: "desc" },
            PUBLISHED_AT_DESC,
          ]
        }
        return [{ rankScore: "desc" }, PUBLISHED_AT_DESC]
    }
  })()

  return [DISPLAY_PRIORITY_ASC, ...tail]
}

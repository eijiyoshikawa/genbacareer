import { prisma } from "./db"
import { CONSTRUCTION_CATEGORY_VALUES } from "./categories"

/** 未登録ユーザーが /jobs 一覧で閲覧できる最大件数。詳細閲覧可能セットの大きさでもある。 */
export const GUEST_LIMIT = 15

/**
 * /jobs 一覧のデフォルト（"recommended"）ソート順。
 * C8 上位表示 + 公平ローテーション:
 *   1. company.planTier desc — プラン優先度 (3=paid / 2=SNS / 1=キャンペーン / 0=HW)
 *   2. company.rotationKey asc — 日次でランダム化 (paid 平等枠の機会均等)
 *   3. rankScore desc — 同 rotationKey 内では既存のコンテンツ品質順
 *   4. publishedAt desc — タイブレーク
 *
 * getGuestAccessibleJobIds() と src/app/jobs/page.tsx の buildOrderBy("recommended")
 * が同じ並び順を共有するために、ここで一元管理する
 * (過去に両者が乖離し、/jobs 一覧の上位に出た求人が詳細ページでは
 * ゲスト非対象と判定されるバグがあった)。
 */
export const RECOMMENDED_ORDER_BY = [
  { company: { planTier: "desc" as const } },
  { company: { rotationKey: "asc" as const } },
  { rankScore: "desc" as const },
  { publishedAt: "desc" as const },
]

/**
 * 検索エンジン・SNS 等のクローラ UA。
 * 詳細ページの構造化データ（Google for Jobs）を取得させるため、
 * 未登録ゲートの対象外とする。
 */
const CRAWLER_UA_PATTERNS: RegExp[] = [
  /googlebot/i,
  /google-extended/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /applebot/i,
  /facebookexternalhit/i,
  /twitterbot/i,
  /linkedinbot/i,
  /pinterestbot/i,
]

export function isCrawlerUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false
  return CRAWLER_UA_PATTERNS.some((re) => re.test(ua))
}

/**
 * 未登録ゲストが詳細を閲覧できる「グローバル上位 GUEST_LIMIT 件」の job ID を返す。
 * /jobs 一覧のデフォルト（フィルタ無し・recommended sort）と同じ並び順。
 *
 * 高度に絞り込んだ検索結果からのクリックは未登録ゲートに引っかかるが、
 * これは仕様（無料体験は上位 15 件まで）として明示的に許容している。
 */
export async function getGuestAccessibleJobIds(): Promise<string[]> {
  const rows = await prisma.job.findMany({
    where: {
      status: "active",
      category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
    },
    orderBy: RECOMMENDED_ORDER_BY,
    take: GUEST_LIMIT,
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

import { prisma } from "./db"
import { buildPublicJobOrderBy } from "@/lib/job-sort"
import { CONSTRUCTION_CATEGORY_VALUES } from "./categories"

/** 未登録ユーザーが /jobs 一覧で閲覧できる最大件数。詳細閲覧可能セットの大きさでもある。 */
export const GUEST_LIMIT = 15

/**
 * 検索エンジン・SNS 等のクローラ UA。
 * 詳細ページの構造化データ（Google for Jobs）を取得させるため、
 * 未登録ゲートの対象外とする。
 *
 * NOTE: Google は通常クロール (Googlebot) 以外にも以下の専用 UA を使う:
 *   - Google-InspectionTool/1.0  ← リッチリザルトテスト / Search Console URL 検査
 *   - GoogleOther                ← 一般的な Google プロダクト用
 *   - Google-Extended            ← 生成 AI 学習用 (許可するかは別判断)
 * Google-InspectionTool は "Googlebot" を含まないため、明示的に追加する。
 * (これが無いと Rich Results Test が /login にリダイレクトされて noindex 判定される)
 */
const CRAWLER_UA_PATTERNS: RegExp[] = [
  /googlebot/i,
  /google-inspectiontool/i,
  /google-extended/i,
  /googleother/i,
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
    // /jobs 一覧のデフォルト表示と同一の並び順を使う。別定義にしていたため、
    // 一覧の上位 15 件 (企業プラン/ローテーション込み) とゲートが許可する
    // 15 件がずれ、一覧に見えている求人を押すとログインへ飛ばされていた。
    orderBy: buildPublicJobOrderBy("recommended", { includeCompanyTier: true }),
    take: GUEST_LIMIT,
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

/**
 * 未ログインのリクエストが閲覧できる求人 ID の集合を返す。
 * 制限なし (ログイン済み / クローラ) の場合は null。
 *
 * 求人詳細 (/jobs/[id]) と同じ判定を、印刷・比較・API など詳細の内容を返す
 * 他の経路でも使うための共通化。これらはゲートが無く、ID さえ分かれば未登録でも
 * 全求人の詳細を読めていた。
 */
export async function getGuestJobIdLimit(args: {
  loggedIn: boolean
  userAgent: string | null | undefined
}): Promise<Set<string> | null> {
  if (args.loggedIn) return null
  if (isCrawlerUserAgent(args.userAgent)) return null
  return new Set(await getGuestAccessibleJobIds())
}

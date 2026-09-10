import { prisma } from "./db"
import { CONSTRUCTION_CATEGORY_VALUES } from "./categories"

/** 未登録ユーザーが /jobs 一覧で閲覧できる最大件数。詳細閲覧可能セットの大きさでもある。 */
export const GUEST_LIMIT = 15

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
    orderBy: [
      { source: "asc" },
      { rankScore: "desc" },
      { publishedAt: "desc" },
    ],
    take: GUEST_LIMIT,
    select: { id: true },
  })
  return rows.map((r) => r.id)
}

/**
 * 未登録ゲストが指定の求人詳細を閲覧できないか（ゲートすべきか）を判定する。
 *
 * 求人詳細を返すすべての面（ページ / API / 印刷用ページ）で同じ基準を
 * 使うための共通ヘルパー。ここを直さずに個別実装すると、片方だけ
 * ゲートを忘れて「未登録ゲスト上位 15 件まで」の制限がバイパスされる。
 */
export async function isGuestBlockedFromJob(args: {
  hasSession: boolean
  userAgent: string | null | undefined
  jobId: string
  isPreview?: boolean
}): Promise<boolean> {
  if (args.hasSession || args.isPreview) return false
  if (isCrawlerUserAgent(args.userAgent)) return false
  const allowedIds = await getGuestAccessibleJobIds()
  return !allowedIds.includes(args.jobId)
}

/**
 * ?preview=<token> クエリパラメータが、その求人の Job.previewToken と
 * 実際に一致するかを判定する。
 *
 * "1" のような固定値ではなくトークンそのものを要求することで、
 * /jobs/preview/[token] での事前チェックを経由したことを保証する。
 * ここを緩めると、トークンを持たない誰でも ?preview=<何か> を付けるだけで
 * 未登録ゲスト向けの登録ゲートを迂回できてしまう。
 */
export function isValidPreviewToken(
  jobPreviewToken: string | null | undefined,
  providedToken: string | null | undefined
): boolean {
  return !!jobPreviewToken && !!providedToken && providedToken === jobPreviewToken
}

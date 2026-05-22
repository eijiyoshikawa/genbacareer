/**
 * 流入分析用のヘルパー。UTM パラメータ抽出、Bot 判定、JobView 保存。
 */

import { prisma } from "./db"

export interface UtmParams {
  source: string | null
  medium: string | null
  campaign: string | null
}

/** URL の searchParams から UTM 系を取り出す。 */
export function extractUtmFromUrl(url: string | URL): UtmParams {
  let sp: URLSearchParams
  try {
    sp = typeof url === "string" ? new URL(url).searchParams : url.searchParams
  } catch {
    return { source: null, medium: null, campaign: null }
  }
  const trim = (s: string | null) => (s ? s.slice(0, 100).trim() || null : null)
  return {
    source: trim(sp.get("utm_source")),
    medium: trim(sp.get("utm_medium")),
    campaign: trim(sp.get("utm_campaign")),
  }
}

/**
 * よくある検索エンジン bot / クローラを除外。
 * 完全ではないが、Google / Bing / Baidu / Yahoo / Yandex / 主要 SEO ツール を排除する。
 */
const BOT_UA = /bot|crawler|spider|crawling|slurp|bingpreview|preview|fetcher|monitor|axios|curl|wget|python-requests|headlesschrome/i

export function isLikelyBot(userAgent: string | null | undefined): boolean {
  if (!userAgent) return true
  return BOT_UA.test(userAgent)
}

export interface RecordJobViewInput {
  jobId: string
  sessionId: string | null
  userId: string | null
  ipAddress: string | null
  userAgent: string | null
  referer: string | null
  utm: UtmParams
}

/**
 * JobView を 1 行 INSERT する fire-and-forget ヘルパー。
 * - Bot UA は skip
 * - 同一 sessionId + jobId は直近 5 分以内なら skip（バウンス防止）
 * - 失敗してもページ表示には影響させない
 */
export async function recordJobView(input: RecordJobViewInput): Promise<void> {
  if (isLikelyBot(input.userAgent)) return

  try {
    // 重複抑制: 同セッションで同求人を 5 分以内に再ロードしても 1 回だけ記録
    if (input.sessionId) {
      const recent = await prisma.jobView.findFirst({
        where: {
          jobId: input.jobId,
          sessionId: input.sessionId,
          viewedAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
        select: { id: true },
      })
      if (recent) return
    }

    await prisma.jobView.create({
      data: {
        jobId: input.jobId,
        sessionId: input.sessionId,
        userId: input.userId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent?.slice(0, 500) ?? null,
        referer: input.referer?.slice(0, 500) ?? null,
        utmSource: input.utm.source,
        utmMedium: input.utm.medium,
        utmCampaign: input.utm.campaign,
      },
    })
  } catch (e) {
    // テーブル未作成・接続エラーなどはサイレントにスキップ
    console.warn(`[tracking.jobView] ${e instanceof Error ? e.message : e}`)
  }
}

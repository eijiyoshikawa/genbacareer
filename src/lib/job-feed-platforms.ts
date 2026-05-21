/**
 * 求人 XML フィード配信先プラットフォームの設定。
 *
 * 主要な JP 求人アグリゲータは Indeed 互換 XML を受理するため、
 * 1 つのフィード (`/jobs.xml`) を `?source=PLATFORM` クエリで分岐させ、
 * 求人 URL に utm_source を付与してトラフィック計測できるようにする。
 *
 * 各プラットフォームは以下の情報を持つ:
 *   - id          : URL クエリパラメータ値
 *   - label       : 管理画面表示用
 *   - feedFormat  : "indeed_compat" (Indeed XML) — 将来 "glassdoor" 等を追加可能
 *   - utmSource   : Google Analytics で見たい流入元名
 *   - registrationUrl: 媒体側の登録ページ
 *   - notes       : 補足
 */

export interface JobFeedPlatform {
  id: string
  label: string
  feedFormat: "indeed_compat"
  utmSource: string
  registrationUrl: string
  notes?: string
}

export const JOB_FEED_PLATFORMS: ReadonlyArray<JobFeedPlatform> = [
  {
    id: "indeed",
    label: "Indeed",
    feedFormat: "indeed_compat",
    utmSource: "indeed",
    registrationUrl: "https://employers.indeed.com/",
    notes: "公式 XML フィード仕様。docs/indeed-integration.md 参照。",
  },
  {
    id: "kyujinbox",
    label: "求人ボックス",
    feedFormat: "indeed_compat",
    utmSource: "kyujinbox",
    registrationUrl: "https://corp.kakaku.com/service/job/",
    notes: "カカクコム運営。Indeed 互換 XML を受理。",
  },
  {
    id: "stanby",
    label: "スタンバイ",
    feedFormat: "indeed_compat",
    utmSource: "stanby",
    registrationUrl: "https://corporate.stanby.co.jp/",
    notes: "LINEヤフー運営。Indeed 互換 XML を受理。",
  },
  {
    id: "glassdoor",
    label: "Glassdoor",
    feedFormat: "indeed_compat",
    utmSource: "glassdoor",
    registrationUrl: "https://www.glassdoor.com/employers/",
    notes: "Indeed 同一グループ。Indeed と同じフィードでカバー可。",
  },
  {
    id: "careerjet",
    label: "Careerjet",
    feedFormat: "indeed_compat",
    utmSource: "careerjet",
    registrationUrl: "https://www.careerjet.jp/employer.html",
    notes: "Indeed 互換 XML を受理。",
  },
  {
    id: "jooble",
    label: "Jooble",
    feedFormat: "indeed_compat",
    utmSource: "jooble",
    registrationUrl: "https://jp.jooble.org/about-employers",
    notes: "Indeed 互換 XML を受理。",
  },
] as const

/** URL クエリ ?source= から対応プラットフォーム設定を返す */
export function resolveFeedPlatform(
  source: string | null | undefined,
): JobFeedPlatform | null {
  if (!source) return null
  const found = JOB_FEED_PLATFORMS.find((p) => p.id === source.toLowerCase())
  return found ?? null
}

/**
 * 求人詳細 URL に UTM パラメータを付与する。
 *
 * 例:
 *   buildJobUrlWithUtm({
 *     base: "https://genbacareer.jp/jobs/abc",
 *     platform: { utmSource: "kyujinbox", ... },
 *   })
 *   → "https://genbacareer.jp/jobs/abc?utm_source=kyujinbox&utm_medium=feed&utm_campaign=job_feed"
 */
export function buildJobUrlWithUtm(args: {
  base: string
  platform: JobFeedPlatform | null
}): string {
  if (!args.platform) return args.base
  const u = new URL(args.base)
  u.searchParams.set("utm_source", args.platform.utmSource)
  u.searchParams.set("utm_medium", "feed")
  u.searchParams.set("utm_campaign", "job_feed")
  return u.toString()
}

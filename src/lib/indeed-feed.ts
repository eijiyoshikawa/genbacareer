/**
 * Indeed XML フィード (Phase A: organic listing) 生成ヘルパ。
 *
 * 仕様: https://docs.indeed.com/job-listings/job-feed
 * 形式: <source>...<job>...</job></source>
 *
 * 配信対象の絞り込み方針:
 *   - source='direct' (HelloWork 取り込みは除外、Indeed は別ルートで HelloWork と契約済)
 *   - status='active'
 *   - Company.planType が有効プランかつ planActive (期限内) のもののみ
 *     - success_fee / monthly_12 / monthly_24 / sns_client → 配信
 *     - campaign_free → 配信しない (¥0 枠は Indeed への外部配信コストに見合わない判断)
 *
 * 重要な制約:
 *   - 1 求人 1 <job> エントリ
 *   - 文字列は必ず CDATA でラップ (HTML は description に含めて良い)
 *   - employmentType は Indeed 規定値にマップ
 *   - 日付は RFC 822 形式
 */

/** Indeed 規定の jobtype 値 (https://docs.indeed.com/job-listings/jobtype) */
const INDEED_JOB_TYPE: Record<string, string> = {
  full_time: "fulltime",
  part_time: "parttime",
  contract: "contract",
}

/** Indeed feed の <job> 要素を生成するのに必要な最小フィールド */
export interface IndeedFeedJob {
  id: string
  title: string
  description: string | null
  prefecture: string | null
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  employmentType: string | null
  category: string
  publishedAt: Date | null
  company: {
    name: string
  } | null
}

/** XML 特殊文字をエスケープ (CDATA 内では `]]>` のみケア) */
function escapeCdata(s: string): string {
  return s.replace(/]]>/g, "]]]]><![CDATA[>")
}

/** CDATA でラップ */
function cdata(s: string | null | undefined): string {
  if (!s) return "<![CDATA[]]>"
  return `<![CDATA[${escapeCdata(s)}]]>`
}

/** RFC 822 形式の日付に整形 (Indeed が要求する <date> フォーマット) */
export function formatRfc822(d: Date): string {
  return d.toUTCString()
}

/** 給与レンジを Indeed の <salary> 用テキストに整形 */
export function formatSalaryForIndeed(args: {
  min: number | null
  max: number | null
  type: string | null
}): string {
  const { min, max, type } = args
  if (!min && !max) return ""

  const period = (() => {
    switch (type) {
      case "monthly":
        return "月"
      case "annual":
        return "年"
      case "daily":
        return "日"
      case "hourly":
        return "時"
      default:
        return "月" // unknown は月給として扱う (建設業の主流)
    }
  })()

  const fmt = (n: number) => `¥${n.toLocaleString()}`

  if (min && max && min !== max) return `${fmt(min)} 〜 ${fmt(max)} / ${period}`
  if (min) return `${fmt(min)} 以上 / ${period}`
  if (max) return `${fmt(max)} 以下 / ${period}`
  return ""
}

/** 雇用形態を Indeed 規定値にマップ */
export function mapEmploymentTypeToIndeed(t: string | null): string {
  if (!t) return ""
  return INDEED_JOB_TYPE[t] ?? ""
}

/** 1 件の <job> XML 文字列を生成。urlBuilder で UTM 等を付与可能 */
export function renderIndeedJobEntry(args: {
  job: IndeedFeedJob
  baseUrl: string
  /** デフォルトは `${baseUrl}/jobs/${id}`。指定すると UTM 等を付与できる */
  urlBuilder?: (jobId: string) => string
}): string {
  const { job, baseUrl } = args
  const jobUrl = args.urlBuilder
    ? args.urlBuilder(job.id)
    : `${baseUrl}/jobs/${job.id}`
  const date = job.publishedAt ?? new Date()
  const salary = formatSalaryForIndeed({
    min: job.salaryMin,
    max: job.salaryMax,
    type: job.salaryType,
  })
  const jobtype = mapEmploymentTypeToIndeed(job.employmentType)

  return `  <job>
    <title>${cdata(job.title)}</title>
    <date>${cdata(formatRfc822(date))}</date>
    <referencenumber>${cdata(job.id)}</referencenumber>
    <url>${cdata(jobUrl)}</url>
    <company>${cdata(job.company?.name ?? "")}</company>
    <city>${cdata(job.city ?? "")}</city>
    <state>${cdata(job.prefecture ?? "")}</state>
    <country>${cdata("JP")}</country>
    <description>${cdata(job.description ?? "")}</description>
    <salary>${cdata(salary)}</salary>
    <jobtype>${cdata(jobtype)}</jobtype>
    <category>${cdata(job.category)}</category>
  </job>`
}

/** XML 全体を組み立てる */
export function renderIndeedFeed(args: {
  jobs: IndeedFeedJob[]
  baseUrl: string
  publisherName?: string
  generatedAt?: Date
  /** 各求人 URL を組み立てる関数 (UTM パラメータ付与等)。
   *  指定しなければデフォルトは `${baseUrl}/jobs/${id}`。 */
  urlBuilder?: (jobId: string) => string
}): string {
  const publisher = args.publisherName ?? "ゲンバキャリア"
  const builtAt = args.generatedAt ?? new Date()

  const entries = args.jobs
    .map((job) =>
      renderIndeedJobEntry({
        job,
        baseUrl: args.baseUrl,
        urlBuilder: args.urlBuilder,
      }),
    )
    .join("\n")

  return `<?xml version="1.0" encoding="utf-8"?>
<source>
  <publisher>${cdata(publisher)}</publisher>
  <publisherurl>${cdata(args.baseUrl)}</publisherurl>
  <lastBuildDate>${cdata(formatRfc822(builtAt))}</lastBuildDate>
${entries}
</source>
`
}

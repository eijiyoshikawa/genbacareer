/**
 * 14.1 Indeed XML Feed (求人アグリゲーション連携)。
 *
 * Indeed Publisher / Job Aggregator が読み取れる形式の XML feed。
 * 仕様: https://docs.indeed.com/job-feeds
 *
 * - GET /feed/indeed.xml
 * - active な公開求人を 5000 件まで出力 (Indeed の推奨上限以内)
 * - 60 分 ISR でキャッシュ (force-dynamic で build 失敗回避)
 *
 * Indeed への申請手順:
 *   1. https://employers.indeed.com/p/cpc/feed-options で「XML feed」選択
 *   2. URL: https://www.genbacareer.jp/feed/indeed.xml を登録
 *   3. 審査通過後、Indeed が定期クロール
 */

import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES, getCategoryLabel } from "@/lib/categories"

export const dynamic = "force-dynamic"
export const revalidate = 3600

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function cdata(s: string): string {
  // CDATA で囲む。`]]>` は分割エスケープ
  return `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`
}

function formatSalary(job: {
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
}): string {
  if (!job.salaryMin && !job.salaryMax) return ""
  const unit =
    job.salaryType === "hourly"
      ? "yearly" // Indeed は yearly を推奨だが時給は別途扱う
      : "yearly"
  const min = job.salaryMin ?? job.salaryMax ?? 0
  const max = job.salaryMax ?? job.salaryMin ?? 0
  // 月給/時給は Indeed 仕様で yearly に換算
  const yearlyMin = job.salaryType === "hourly" ? min * 8 * 250 : job.salaryType === "monthly" ? min * 12 : min
  const yearlyMax = job.salaryType === "hourly" ? max * 8 * 250 : job.salaryType === "monthly" ? max * 12 : max
  return `<salary>${yearlyMin}〜${yearlyMax} JPY/${unit}</salary>`
}

export async function GET() {
  const jobs = await prisma.job.findMany({
    where: {
      status: "active",
      category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
      // 説明文が空の求人は Indeed の品質要件を満たさないので除外
      NOT: { description: null },
    },
    select: {
      id: true,
      title: true,
      description: true,
      category: true,
      employmentType: true,
      salaryMin: true,
      salaryMax: true,
      salaryType: true,
      prefecture: true,
      city: true,
      address: true,
      publishedAt: true,
      updatedAt: true,
      company: { select: { name: true } },
    },
    orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
    take: 5000,
  }).catch(() => [])

  const items = jobs
    .map((j) => {
      const pubDate = (j.publishedAt ?? j.updatedAt).toUTCString()
      const url = `${SITE_URL}/jobs/${j.id}`
      const companyName = j.company?.name ?? "ゲンバキャリア"
      const location = [j.prefecture, j.city, j.address].filter(Boolean).join(" ")
      return `    <job>
      <title>${cdata(j.title)}</title>
      <date>${pubDate}</date>
      <referencenumber>${j.id}</referencenumber>
      <url>${escapeXml(url)}</url>
      <company>${cdata(companyName)}</company>
      <city>${cdata(j.city ?? "")}</city>
      <state>${cdata(j.prefecture)}</state>
      <country>JP</country>
      <postalcode></postalcode>
      <description>${cdata(j.description ?? "")}</description>
      ${formatSalary(j)}
      <education></education>
      <jobtype>${cdata(j.employmentType ?? "")}</jobtype>
      <category>${cdata(getCategoryLabel(j.category))}</category>
      <experience></experience>
      <location>${cdata(location)}</location>
    </job>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<source>
  <publisher>ゲンバキャリア</publisher>
  <publisherurl>${SITE_URL}</publisherurl>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</source>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

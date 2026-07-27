/**
 * 14.1 Indeed XML Feed (求人アグリゲーション連携)。
 *
 * Indeed Publisher / Job Aggregator が読み取れる形式の XML feed。
 * 仕様: https://docs.indeed.com/job-feeds
 *
 * - GET /feed/indeed.xml
 * - 60 分キャッシュ
 *
 * このルートは /jobs.xml (PR #212/#217, docs/indeed-integration.md 記載の
 * 正式な配信 URL) と同一のフィルタ・レンダリングロジックに委譲する。
 * 過去に /jobs.xml より先に作られた実装が個別に持っていたが、
 * source/plan フィルタが無いまま放置されており、HelloWork 由来求人や
 * 未課金 (campaign_free) 求人まで無条件に配信してしまうバグがあった。
 * ロジックの二重管理を避けるため lib/indeed-feed.ts の共通実装に統一する。
 *
 * Indeed への申請手順は docs/indeed-integration.md 参照
 * (登録 URL は https://www.genbacareer.jp/jobs.xml)。
 */

import { prisma } from "@/lib/db"
import { renderIndeedFeed, type IndeedFeedJob } from "@/lib/indeed-feed"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"
const MAX_JOBS = 5_000

export async function GET() {
  const now = new Date()

  const rows = await prisma.job
    .findMany({
      where: {
        status: "active",
        source: "direct",
        company: {
          OR: [
            { planType: "success_fee" },
            {
              planType: { in: ["monthly_12", "monthly_24", "sns_client"] },
              planPaidUntil: { gt: now },
            },
          ],
        },
      },
      orderBy: [{ publishedAt: "desc" }],
      take: MAX_JOBS,
      select: {
        id: true,
        title: true,
        description: true,
        prefecture: true,
        city: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        employmentType: true,
        category: true,
        publishedAt: true,
        company: { select: { name: true } },
      },
    })
    .catch((err) => {
      console.error("[feed/indeed.xml] query failed:", err)
      return []
    })

  const jobs: IndeedFeedJob[] = rows.map((j) => ({
    id: j.id,
    title: j.title,
    description: j.description,
    prefecture: j.prefecture,
    city: j.city,
    salaryMin: j.salaryMin,
    salaryMax: j.salaryMax,
    salaryType: j.salaryType,
    employmentType: j.employmentType,
    category: j.category,
    publishedAt: j.publishedAt,
    company: j.company,
  }))

  const xml = renderIndeedFeed({
    jobs,
    baseUrl: SITE_URL,
    generatedAt: now,
  })

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  })
}

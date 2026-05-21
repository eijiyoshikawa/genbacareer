/**
 * GET /jobs.xml — 求人 XML フィード (Indeed 互換)。
 *
 * 複数の求人アグリゲータ向けに 1 つの URL で配信する Indeed 互換 XML。
 * 主要 JP 媒体 (Indeed / 求人ボックス / スタンバイ / Glassdoor / Careerjet / Jooble)
 * はすべてこの仕様を受理する。
 *
 * クエリ ?source=PLATFORM を付けると、求人 URL に utm_source を埋め込んで
 * トラフィック計測できるようにする。
 *
 *   /jobs.xml                       — 素のフィード (UTM なし)
 *   /jobs.xml?source=indeed         — Indeed 用 (utm_source=indeed)
 *   /jobs.xml?source=kyujinbox      — 求人ボックス用
 *   /jobs.xml?source=stanby         — スタンバイ用
 *   /jobs.xml?source=glassdoor      — Glassdoor 用
 *
 * 仕様: https://docs.indeed.com/job-listings/job-feed
 *
 * 配信対象:
 *   - source='direct' (HelloWork 取り込みは除外)
 *   - status='active'
 *   - 企業のプランが有償 (success_fee / monthly_12 / monthly_24 / sns_client)
 *     かつアクティブ (期限内)
 *   - campaign_free は除外 (¥0 枠は外部配信コスト的に対象外)
 *
 * キャッシュ: 1 時間 (各プラットフォームは 1 日 1 回程度のフェッチ)
 *
 * パフォーマンス: 直接掲載企業の active 求人のみなので、最大でも数千件想定。
 */

import { prisma } from "@/lib/db"
import {
  renderIndeedFeed,
  type IndeedFeedJob,
} from "@/lib/indeed-feed"
import {
  resolveFeedPlatform,
  buildJobUrlWithUtm,
} from "@/lib/job-feed-platforms"
import type { NextRequest } from "next/server"

export const dynamic = "force-dynamic"
// Vercel エッジでの 60s timeout を避けるため Node.js runtime。
export const runtime = "nodejs"

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

// 1 フィードあたりの上限。各媒体の推奨は無いが、応答サイズと生成コスト抑制のため。
const MAX_JOBS = 5_000

export async function GET(request: NextRequest) {
  const now = new Date()
  const sourceParam = request.nextUrl.searchParams.get("source")
  const platform = resolveFeedPlatform(sourceParam)

  const rows = await prisma.job
    .findMany({
      where: {
        status: "active",
        source: "direct",
        company: {
          // 課金プランかつ active
          OR: [
            {
              planType: "success_fee",
              // success_fee は期限なし
            },
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
      console.error("[indeed-feed] query failed:", err)
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

  // ?source= が指定されていれば求人 URL に utm_source を付与
  const urlBuilder = platform
    ? (jobId: string) =>
        buildJobUrlWithUtm({
          base: `${BASE_URL}/jobs/${jobId}`,
          platform,
        })
    : undefined

  const xml = renderIndeedFeed({
    jobs,
    baseUrl: BASE_URL,
    generatedAt: now,
    urlBuilder,
  })

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      // 各媒体は 1 日 1 回程度フェッチするので 1 時間キャッシュで十分。
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=300",
    },
  })
}

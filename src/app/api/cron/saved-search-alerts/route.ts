/**
 * POST /api/cron/saved-search-alerts
 *
 * 保存検索 + フォロー企業の新着求人をユーザーへ通知する日次バッチ。
 * Vercel Cron か外部スケジューラから Bearer CRON_SECRET 付きで叩く。
 *
 * Phase 1: 各 SavedSearch (alertEnabled=true) について、lastNotifiedAt 以降の
 *          新着 active 求人を上位 5 件取得し通知。
 * Phase 2: 各 CompanyFollow について、lastNotifiedAt 以降の新着 active 求人を
 *          上位 5 件取得し通知。
 */

import { prisma } from "@/lib/db"
import { createNotification } from "@/lib/notifications"
import {
  findNewMatchingJobs,
  formatSearchLabel,
  toSearchQueryString,
} from "@/lib/saved-searches"
import { verifyCronRequest } from "@/lib/cron-auth"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const MATCH_LIMIT = 5

/**
 * 次回実行の起点 (lastNotifiedAt) を決める。
 *
 * 取得件数が limit ちょうど (= まだバックログが残っている可能性がある) の場合は
 * "今" まで進めず、今回通知したバッチの中で一番新しい publishedAt + 1ms に
 * 留める。こうしないと、1 日の新着が limit を超えた保存検索/フォローで
 * 古い方の求人が「lastNotifiedAt が今日まで進んだせいで二度と検索対象に
 * 入らない」まま消えてしまう。
 */
function nextWatermark(
  matches: Array<{ publishedAt: Date | null }>,
  limit: number,
  startedAt: Date
): Date {
  if (matches.length < limit) return startedAt
  const last = matches[matches.length - 1]?.publishedAt
  if (!last) return startedAt
  return new Date(last.getTime() + 1)
}

export async function GET(request: Request) {
  if (!verifyCronRequest(request)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = new Date()
  const errors: string[] = []

  // ---------- Phase 1: SavedSearch ----------
  const searches = await prisma.savedSearch.findMany({
    where: { alertEnabled: true },
    orderBy: { lastNotifiedAt: { sort: "asc", nulls: "first" } },
    take: 500,
  })

  let searchProcessed = 0
  let searchNotified = 0

  for (const s of searches) {
    searchProcessed++
    try {
      const matches = await findNewMatchingJobs(s, MATCH_LIMIT)
      const watermark = nextWatermark(matches, MATCH_LIMIT, startedAt)

      if (matches.length === 0) {
        await prisma.savedSearch.update({
          where: { id: s.id },
          data: { lastNotifiedAt: watermark },
        })
        continue
      }

      const qs = toSearchQueryString(s)
      const link = qs ? `/jobs?${qs}` : "/jobs"

      await createNotification({
        userId: s.userId,
        type: "system",
        title: `🆕 「${s.name}」に新着求人 ${matches.length} 件`,
        body: `条件: ${formatSearchLabel(s)}`,
        items: matches.map((m) => m.title),
        linkUrl: link,
        linkLabel: "新着求人を見る",
        refId: s.id,
      })

      await prisma.savedSearch.update({
        where: { id: s.id },
        data: { lastNotifiedAt: watermark },
      })
      searchNotified++
    } catch (e) {
      errors.push(`search:${s.id}: ${e instanceof Error ? e.message : e}`)
    }
  }

  // ---------- Phase 2: CompanyFollow ----------
  const follows = await prisma.companyFollow.findMany({
    orderBy: { lastNotifiedAt: { sort: "asc", nulls: "first" } },
    take: 500,
    select: {
      userId: true,
      companyId: true,
      lastNotifiedAt: true,
      createdAt: true,
      company: { select: { name: true, status: true, source: true } },
    },
  })

  let followProcessed = 0
  let followNotified = 0

  for (const f of follows) {
    followProcessed++
    try {
      // 公開対象外の企業はスキップ（フォローレコードは保持）
      if (f.company.status !== "approved" || f.company.source !== "direct") {
        await prisma.companyFollow.update({
          where: {
            userId_companyId: { userId: f.userId, companyId: f.companyId },
          },
          data: { lastNotifiedAt: startedAt },
        })
        continue
      }

      const since = f.lastNotifiedAt ?? f.createdAt
      const matches = await prisma.job
        .findMany({
          where: {
            companyId: f.companyId,
            status: "active",
            publishedAt: { gte: since },
          },
          orderBy: { publishedAt: "asc" },
          take: MATCH_LIMIT,
          select: { id: true, title: true, publishedAt: true },
        })
        .catch(() => [])
      const watermark = nextWatermark(matches, MATCH_LIMIT, startedAt)

      if (matches.length === 0) {
        await prisma.companyFollow.update({
          where: {
            userId_companyId: { userId: f.userId, companyId: f.companyId },
          },
          data: { lastNotifiedAt: watermark },
        })
        continue
      }

      const sample = matches.slice(0, 3)
      const titleBody = sample.map((m) => `・${m.title}`).join("\n")
      const moreText =
        matches.length > 3 ? `\n... 他 ${matches.length - 3} 件` : ""

      await createNotification({
        userId: f.userId,
        type: "system",
        title: `🆕 ${f.company.name} の新着求人 ${matches.length} 件`,
        body: `フォロー中の企業に新しい求人が公開されました。\n\n${titleBody}${moreText}`,
        linkUrl: `/companies/${f.companyId}`,
        refId: f.companyId,
      })

      await prisma.companyFollow.update({
        where: {
          userId_companyId: { userId: f.userId, companyId: f.companyId },
        },
        data: { lastNotifiedAt: watermark },
      })
      followNotified++
    } catch (e) {
      errors.push(
        `follow:${f.userId}/${f.companyId}: ${e instanceof Error ? e.message : e}`
      )
    }
  }

  return Response.json({
    timestamp: startedAt.toISOString(),
    search: { processed: searchProcessed, notified: searchNotified },
    follow: { processed: followProcessed, notified: followNotified },
    errors: errors.slice(0, 10),
  })
}

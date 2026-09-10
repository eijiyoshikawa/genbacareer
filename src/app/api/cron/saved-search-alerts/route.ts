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

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

/**
 * 通知本文には上位 N 件だけ表示する（メールが長くなりすぎないため）。
 * カーソル（lastNotifiedAt）の前進判定には別途、これより大きい FETCH_CAP 件で
 * 取得した結果を使う。DISPLAY_LIMIT で fetch すると、その日に DISPLAY_LIMIT
 * 件を超える新着があった場合に古い方が「二度と拾われない」まま
 * lastNotifiedAt が現在時刻まで進んでしまう（旧実装のバグ）。
 */
export const DISPLAY_LIMIT = 5
export const FETCH_CAP = 50

/**
 * 次回実行時に取りこぼしが出ないよう、lastNotifiedAt をどこまで進めてよいかを決める。
 *
 * - 取得件数が FETCH_CAP 未満 → その期間の新着を全件拾えている → startedAt まで進めてよい
 * - 取得件数が FETCH_CAP 件ちょうど → CAP 超過分が残っている可能性があるので、
 *   今回拾えた最古の求人の publishedAt の直後までしか進めない
 *   （+1ms することで、その最古の求人自体が次回また一致してしまうのを防ぐ）
 */
export function nextCursor(
  matches: Array<{ publishedAt: Date | null }>,
  startedAt: Date
): Date {
  if (matches.length < FETCH_CAP) return startedAt
  const oldest = matches[matches.length - 1]?.publishedAt
  if (!oldest) return startedAt
  return new Date(oldest.getTime() + 1)
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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
      const matches = await findNewMatchingJobs(s, FETCH_CAP)
      const cursor = nextCursor(matches, startedAt)
      if (matches.length === 0) {
        await prisma.savedSearch.update({
          where: { id: s.id },
          data: { lastNotifiedAt: cursor },
        })
        continue
      }

      const qs = toSearchQueryString(s)
      const link = qs ? `/jobs?${qs}` : "/jobs"
      const displayed = matches.slice(0, DISPLAY_LIMIT)
      const moreCount = matches.length - displayed.length

      await createNotification({
        userId: s.userId,
        type: "system",
        title: `🆕 「${s.name}」に新着求人 ${matches.length}${matches.length >= FETCH_CAP ? "+" : ""} 件`,
        body: `条件: ${formatSearchLabel(s)}${moreCount > 0 ? `\n\n... 他 ${moreCount} 件` : ""}`,
        items: displayed.map((m) => m.title),
        linkUrl: link,
        linkLabel: "新着求人を見る",
        refId: s.id,
      })

      await prisma.savedSearch.update({
        where: { id: s.id },
        data: { lastNotifiedAt: cursor },
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
          orderBy: { publishedAt: "desc" },
          take: FETCH_CAP,
          select: { id: true, title: true, publishedAt: true },
        })
        .catch(() => [])
      const cursor = nextCursor(matches, startedAt)

      if (matches.length === 0) {
        await prisma.companyFollow.update({
          where: {
            userId_companyId: { userId: f.userId, companyId: f.companyId },
          },
          data: { lastNotifiedAt: cursor },
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
        title: `🆕 ${f.company.name} の新着求人 ${matches.length}${matches.length >= FETCH_CAP ? "+" : ""} 件`,
        body: `フォロー中の企業に新しい求人が公開されました。\n\n${titleBody}${moreText}`,
        linkUrl: `/companies/${f.companyId}`,
        refId: f.companyId,
      })

      await prisma.companyFollow.update({
        where: {
          userId_companyId: { userId: f.userId, companyId: f.companyId },
        },
        data: { lastNotifiedAt: cursor },
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

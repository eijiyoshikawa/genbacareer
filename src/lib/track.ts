/**
 * 13.4 独自イベントトラッキング。
 *
 * GA4 と並行して、サーバー側で AnalyticsEvent テーブルに
 * 細かいイベントを記録する。GA4 はクライアント JS ベースで
 * AdBlock の影響を受けるが、こちらはサーバー側なので確実。
 *
 * 使い方:
 *   await trackEvent({ name: "view_job", userId, payload: { jobId } })
 *
 * 失敗時は warn ログのみ出してフローを止めない (fire-and-forget OK)。
 *
 * 既存 src/lib/analytics.ts は admin の集計クエリ専用で、
 * このファイルは「イベントを書き込む側」の責務に絞る。
 */

import { prisma } from "@/lib/db"

export type TrackEventName =
  | "view_job"
  | "view_company"
  | "view_article"
  | "search"
  | "apply_start"
  | "apply_submit"
  | "favorite_add"
  | "favorite_remove"
  | "follow_company"
  | "report_submit"
  | "interest_click"
  | "register_complete"
  | "login_complete"
  | "lp_view"
  | "share_article"

interface TrackEventInput {
  name: TrackEventName | (string & {}) // 拡張可能
  userId?: string | null
  sessionId?: string | null
  payload?: Record<string, unknown>
}

/**
 * イベントを記録。fire-and-forget で呼んで OK。
 * 戻り値の Promise は await しなくても良いが、Next.js Server Action 内では
 * await した方が安全 (Vercel のリクエスト境界で abort される可能性)。
 */
export async function trackEvent(input: TrackEventInput): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: input.name,
        userId: input.userId ?? null,
        sessionId: input.sessionId ?? null,
        payload: (input.payload ?? {}) as object,
      },
    })
  } catch (e) {
    console.warn(
      `[track] event failed (${input.name}):`,
      e instanceof Error ? e.message : e
    )
  }
}

/**
 * 直近 N 日のイベント集計を取得 (admin 表示用)。
 * @returns 各イベント名ごとの件数。降順ソート。
 */
export async function getEventCounts(
  days: number
): Promise<{ name: string; count: number }[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const rows = await prisma.analyticsEvent.groupBy({
    by: ["name"],
    _count: { _all: true },
    where: { createdAt: { gte: since } },
    orderBy: { _count: { name: "desc" } },
  })
  return rows.map((r) => ({ name: r.name, count: r._count._all }))
}

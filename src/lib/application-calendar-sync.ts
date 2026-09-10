/**
 * 14.4 Application <-> Google Calendar 同期。
 *
 * Application.interviewAt / interviewVenue / interviewUrl の更新後に呼び出す。
 *
 * - interviewAt が set → 既存 event があれば update、無ければ create
 * - interviewAt が null → 既存 event を delete
 * - 企業が未連携なら何もしない (no-op)
 *
 * 失敗時はログを出して握りつぶす (面接情報の保存自体は失敗させない)。
 */

import { prisma } from "@/lib/db"
import {
  createCalendarEvent,
  deleteCalendarEvent,
  isCompanyCalendarConnected,
  updateCalendarEvent,
  type CalendarEventInput,
} from "@/lib/google-calendar"

const DEFAULT_DURATION_MIN = 60

/**
 * イベント作成中であることを示すマーカー値。Google Calendar の実イベント ID
 * とは絶対に衝突しない固定文字列にしている。
 *
 * 面接情報の保存 → syncApplicationToCalendar 呼び出しは fire-and-forget
 * (await されない) なので、短時間に 2 回保存されると 2 つの呼び出しが
 * どちらも googleCalendarEventId=null を読んで両方 createCalendarEvent して
 * しまい、片方の DB 書き込みが後勝ちで、もう片方の Google Calendar イベントが
 * 孤児化する（以後の更新・削除が一切効かなくなる）レースがあった。
 * このマーカーで「今まさに作成中」という枠を先に確保することで防ぐ。
 */
const PENDING_MARKER = "__pending_calendar_sync__"

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000)
}

export async function syncApplicationToCalendar(applicationId: string): Promise<void> {
  const app = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      companyId: true,
      interviewAt: true,
      interviewVenue: true,
      interviewUrl: true,
      googleCalendarEventId: true,
      user: { select: { name: true, email: true } },
      job: { select: { title: true } },
      company: { select: { name: true } },
    },
  })
  if (!app || !app.companyId) return

  const { connected } = await isCompanyCalendarConnected(app.companyId)
  if (!connected) return

  try {
    // interviewAt が無くなった → event 削除
    if (!app.interviewAt) {
      if (app.googleCalendarEventId === PENDING_MARKER) {
        // 他の呼び出しが作成中のところにキャンセルが割り込んだ稀なケース。
        // マーカーは実イベントではないので削除 API は呼ばず、枠だけ解除する。
        await prisma.application
          .updateMany({
            where: { id: app.id, googleCalendarEventId: PENDING_MARKER },
            data: { googleCalendarEventId: null },
          })
          .catch(() => {})
        return
      }
      if (app.googleCalendarEventId) {
        await deleteCalendarEvent(app.companyId, app.googleCalendarEventId)
        await prisma.application.update({
          where: { id: app.id },
          data: { googleCalendarEventId: null },
        })
      }
      return
    }

    const start = app.interviewAt
    const end = addMinutes(start, DEFAULT_DURATION_MIN)
    const candidateName = app.user.name ?? app.user.email ?? "求職者"

    const descLines: string[] = [
      `求職者: ${candidateName}`,
      app.user.email ? `Email: ${app.user.email}` : "",
      `求人: ${app.job.title}`,
      app.interviewUrl ? `オンライン面接 URL: ${app.interviewUrl}` : "",
      `応募詳細: https://www.genbacareer.jp/company/applications/${app.id}`,
    ].filter(Boolean)

    const input: CalendarEventInput = {
      summary: `【面接】${candidateName} - ${app.job.title}`,
      description: descLines.join("\n"),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      location: app.interviewVenue ?? app.interviewUrl ?? undefined,
      attendees: app.user.email ? [app.user.email] : undefined,
    }

    if (app.googleCalendarEventId === PENDING_MARKER) {
      // 別の呼び出しが今まさに作成中。二重作成を避けてここでは何もしない
      // （面接情報自体は既に保存済みで、Calendar 反映は次回の更新操作か
      // 進行中の作成が完了した時点で解決される）。
      return
    }

    if (app.googleCalendarEventId) {
      await updateCalendarEvent(app.companyId, app.googleCalendarEventId, input)
      return
    }

    // 新規作成: まず PENDING マーカーで枠を確保してから Google API を呼ぶ。
    // where に googleCalendarEventId:null を条件として入れることで、
    // 同時に走った別の呼び出しとの間で「先に枠を取れた方だけが作成する」
    // ことをアトミックに保証する。
    const claim = await prisma.application.updateMany({
      where: { id: app.id, googleCalendarEventId: null },
      data: { googleCalendarEventId: PENDING_MARKER },
    })
    if (claim.count === 0) {
      // 既に他の呼び出しが枠を確保 (作成中 or 作成済み)。ここでは何もしない。
      return
    }

    try {
      const eventId = await createCalendarEvent(app.companyId, input)
      await prisma.application.update({
        where: { id: app.id },
        data: { googleCalendarEventId: eventId },
      })
    } catch (e) {
      // 作成失敗時は PENDING マーカーを解除し、次回呼び出しでリトライできるようにする。
      await prisma.application
        .updateMany({
          where: { id: app.id, googleCalendarEventId: PENDING_MARKER },
          data: { googleCalendarEventId: null },
        })
        .catch(() => {})
      throw e
    }
  } catch (e) {
    console.warn(
      `[calendar-sync] application=${app.id}: ${e instanceof Error ? e.message : e}`
    )
  }
}

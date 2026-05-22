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

    if (app.googleCalendarEventId) {
      await updateCalendarEvent(app.companyId, app.googleCalendarEventId, input)
    } else {
      const eventId = await createCalendarEvent(app.companyId, input)
      await prisma.application.update({
        where: { id: app.id },
        data: { googleCalendarEventId: eventId },
      })
    }
  } catch (e) {
    console.warn(
      `[calendar-sync] application=${app.id}: ${e instanceof Error ? e.message : e}`
    )
  }
}

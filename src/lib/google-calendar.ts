/**
 * 14.4 Google Calendar 連携。
 *
 * 各企業ごとに OAuth で取得したリフレッシュトークンを保管し、
 * 面接日時の作成/更新/削除に合わせて Google Calendar API を叩く。
 *
 * 必要環境変数:
 *  - GOOGLE_CALENDAR_CLIENT_ID
 *  - GOOGLE_CALENDAR_CLIENT_SECRET
 *  - APP_BASE_URL  例: "https://www.genbacareer.jp"  (OAuth callback 用)
 */

import { prisma } from "@/lib/db"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
const USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"
const CAL_API_BASE = "https://www.googleapis.com/calendar/v3"

export const CAL_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
  "openid",
] as const

export function getCalendarCallbackUrl(): string {
  const base =
    process.env.APP_BASE_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "https://www.genbacareer.jp"
  return `${base.replace(/\/$/, "")}/api/company/calendar/callback`
}

export function buildAuthUrl(state: string): string {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  if (!clientId) throw new Error("GOOGLE_CALENDAR_CLIENT_ID is not configured")
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getCalendarCallbackUrl(),
    response_type: "code",
    scope: CAL_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope: string
  token_type: string
  id_token?: string
}

export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth client is not configured")
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getCalendarCallbackUrl(),
      grant_type: "authorization_code",
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Google token exchange failed: ${res.status} ${text}`)
  }
  return (await res.json()) as TokenResponse
}

async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresInSec: number
}> {
  const clientId = process.env.GOOGLE_CALENDAR_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CALENDAR_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("Google Calendar OAuth client is not configured")
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Google token refresh failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token: string; expires_in: number }
  return { accessToken: data.access_token, expiresInSec: data.expires_in }
}

export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { email?: string }
  return data.email ?? null
}

async function getValidAccessToken(companyId: string): Promise<{
  accessToken: string
  calendarId: string
}> {
  const row = await prisma.companyCalendarOauth.findUnique({
    where: { companyId },
  })
  if (!row) throw new Error("Google Calendar 未連携")

  const now = new Date()
  const expiresAt = row.tokenExpiresAt
  if (row.accessToken && expiresAt && expiresAt.getTime() > now.getTime() + 60_000) {
    return { accessToken: row.accessToken, calendarId: row.calendarId }
  }
  const refreshed = await refreshAccessToken(row.refreshToken)
  const newExpiresAt = new Date(Date.now() + refreshed.expiresInSec * 1000)
  await prisma.companyCalendarOauth.update({
    where: { companyId },
    data: {
      accessToken: refreshed.accessToken,
      tokenExpiresAt: newExpiresAt,
    },
  })
  return { accessToken: refreshed.accessToken, calendarId: row.calendarId }
}

export type CalendarEventInput = {
  summary: string
  description?: string
  startIso: string
  endIso: string
  location?: string
  attendees?: string[]
}

function buildEventBody(input: CalendarEventInput) {
  return {
    summary: input.summary,
    description: input.description,
    location: input.location,
    start: { dateTime: input.startIso, timeZone: "Asia/Tokyo" },
    end: { dateTime: input.endIso, timeZone: "Asia/Tokyo" },
    attendees: input.attendees?.map((email) => ({ email })),
    reminders: { useDefault: true },
  }
}

export async function createCalendarEvent(
  companyId: string,
  input: CalendarEventInput
): Promise<string> {
  const { accessToken, calendarId } = await getValidAccessToken(companyId)
  const url = `${CAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=all`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildEventBody(input)),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Calendar createEvent failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { id: string }
  return data.id
}

export async function updateCalendarEvent(
  companyId: string,
  eventId: string,
  input: CalendarEventInput
): Promise<void> {
  const { accessToken, calendarId } = await getValidAccessToken(companyId)
  const url = `${CAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`
  const res = await fetch(url, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildEventBody(input)),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`Calendar updateEvent failed: ${res.status} ${text}`)
  }
}

export async function deleteCalendarEvent(
  companyId: string,
  eventId: string
): Promise<void> {
  const { accessToken, calendarId } = await getValidAccessToken(companyId)
  const url = `${CAL_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=all`
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    const text = await res.text().catch(() => "")
    throw new Error(`Calendar deleteEvent failed: ${res.status} ${text}`)
  }
}

export async function isCompanyCalendarConnected(
  companyId: string
): Promise<{ connected: boolean; email?: string }> {
  const row = await prisma.companyCalendarOauth
    .findUnique({
      where: { companyId },
      select: { email: true },
    })
    .catch(() => null)
  if (!row) return { connected: false }
  return { connected: true, email: row.email }
}

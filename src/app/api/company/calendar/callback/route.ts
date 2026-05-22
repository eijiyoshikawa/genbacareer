/**
 * 14.4 Google Calendar 連携コールバック。
 *
 * GET /api/company/calendar/callback?code=...&state=...
 *  - state を検証 (HMAC, 10 分以内)
 *  - code を access_token + refresh_token に交換
 *  - 取得した refresh_token を CompanyCalendarOauth に upsert
 *  - 企業ダッシュボードへ戻す
 */

import { NextRequest, NextResponse } from "next/server"
import crypto from "node:crypto"
import { prisma } from "@/lib/db"
import {
  exchangeCodeForTokens,
  fetchUserEmail,
} from "@/lib/google-calendar"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

const STATE_MAX_AGE_MS = 10 * 60 * 1000

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? ""
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

function verifyState(state: string): { ok: boolean; companyId?: string } {
  const parts = state.split(".")
  if (parts.length !== 4) return { ok: false }
  const [companyId, nonce, ts, sig] = parts
  const expected = signState(`${companyId}.${nonce}.${ts}`)
  if (
    expected.length !== sig.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))
  ) {
    return { ok: false }
  }
  const issuedAt = Number(ts)
  if (!Number.isFinite(issuedAt)) return { ok: false }
  if (Date.now() - issuedAt > STATE_MAX_AGE_MS) return { ok: false }
  return { ok: true, companyId }
}

function redirectWith(url: URL, msg: string, kind: "ok" | "error") {
  url.pathname = "/company/profile"
  url.search = ""
  url.searchParams.set(`calendar_${kind}`, msg)
  return NextResponse.redirect(url)
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const errorParam = url.searchParams.get("error")

  if (errorParam) {
    return redirectWith(url, errorParam, "error")
  }
  if (!code || !state) {
    return redirectWith(url, "missing_params", "error")
  }
  const verified = verifyState(state)
  if (!verified.ok || !verified.companyId) {
    return redirectWith(url, "invalid_state", "error")
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    if (!tokens.refresh_token) {
      // 既に連携済みアカウントで再認可した場合などに refresh_token が返らないケース。
      // その場合は既存レコードがあれば access_token のみ更新する。
      const existing = await prisma.companyCalendarOauth.findUnique({
        where: { companyId: verified.companyId },
      })
      if (!existing) {
        return redirectWith(url, "no_refresh_token", "error")
      }
      await prisma.companyCalendarOauth.update({
        where: { companyId: verified.companyId },
        data: {
          accessToken: tokens.access_token,
          tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          scope: tokens.scope,
        },
      })
      return redirectWith(url, "reauthorized", "ok")
    }

    const email =
      (await fetchUserEmail(tokens.access_token)) ?? "unknown@example.com"

    await prisma.companyCalendarOauth.upsert({
      where: { companyId: verified.companyId },
      update: {
        email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
      create: {
        companyId: verified.companyId,
        email,
        refreshToken: tokens.refresh_token,
        accessToken: tokens.access_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        scope: tokens.scope,
      },
    })

    return redirectWith(url, "connected", "ok")
  } catch (e) {
    console.error("[calendar-callback]", e)
    return redirectWith(url, "exchange_failed", "error")
  }
}

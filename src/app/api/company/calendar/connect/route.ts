/**
 * 14.4 Google Calendar 連携開始。
 *
 * GET /api/company/calendar/connect
 *  - 企業ユーザー認証必須
 *  - companyId を CSRF 用 state に署名 (HMAC) して付与
 *  - Google OAuth 同意画面に redirect
 */

import { NextResponse } from "next/server"
import crypto from "node:crypto"
import { auth } from "@/lib/auth"
import { buildAuthUrl } from "@/lib/google-calendar"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function signState(payload: string): string {
  const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!secret) throw new Error("AUTH_SECRET is not configured")
  return crypto.createHmac("sha256", secret).update(payload).digest("hex")
}

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin") {
    return NextResponse.json(
      { error: "企業管理者のみが連携できます" },
      { status: 403 }
    )
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return NextResponse.json({ error: "企業情報がありません" }, { status: 403 })
  }

  const nonce = crypto.randomBytes(8).toString("hex")
  const ts = Date.now().toString()
  const payload = `${companyId}.${nonce}.${ts}`
  const sig = signState(payload)
  const state = `${payload}.${sig}`

  const url = buildAuthUrl(state)
  return NextResponse.redirect(url)
}

/**
 * GET /api/line/link/callback?code=...&state=...
 *
 * LINE ログインのコールバック。state（署名 + Cookie 二重送信）を検証し、
 * authorization code を token に交換 → id_token を verify して LINE userId(sub) を取得 →
 * ログイン中ユーザーへ紐付ける。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { verifyLinkState, bindLineUserToAccount } from "@/lib/line-link"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  )
}

function fail(request: NextRequest, reason: string): Response {
  return Response.redirect(`${baseUrl(request)}/mypage?line_link=error&reason=${reason}`)
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get("code")
  const state = searchParams.get("state")

  if (searchParams.get("error")) return fail(request, "denied")
  if (!code || !state) return fail(request, "missing_params")

  // 1. state 検証（署名 + Cookie 二重送信）
  const cookieState = request.cookies.get("line_link_state")?.value
  if (!cookieState || decodeURIComponent(cookieState) !== state) {
    return fail(request, "state_mismatch")
  }
  const stateUserId = verifyLinkState(state)
  if (!stateUserId) return fail(request, "state_invalid")

  // セッションの userId と state の userId が一致することを必須にする
  const session = await auth().catch(() => null)
  const sessionUserId = (session?.user as { id?: string } | undefined)?.id
  if (!sessionUserId || sessionUserId !== stateUserId) {
    return fail(request, "session_mismatch")
  }

  const clientId = process.env.LINE_CLIENT_ID
  const clientSecret = process.env.LINE_CLIENT_SECRET
  if (!clientId || !clientSecret) return fail(request, "unconfigured")

  // 2. code → token 交換
  const redirectUri = `${baseUrl(request)}/api/line/link/callback`
  let tokenJson: { id_token?: string; access_token?: string }
  try {
    const tokenRes = await fetch("https://api.line.me/oauth2/v2.1/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    })
    if (!tokenRes.ok) return fail(request, "token_exchange")
    tokenJson = (await tokenRes.json()) as { id_token?: string; access_token?: string }
  } catch {
    return fail(request, "token_exchange")
  }

  // 3. id_token を verify して sub(LINE userId) と displayName を取得
  let sub: string | null = null
  let displayName: string | null = null
  if (tokenJson.id_token) {
    try {
      const verifyRes = await fetch("https://api.line.me/oauth2/v2.1/verify", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ id_token: tokenJson.id_token, client_id: clientId }),
      })
      if (verifyRes.ok) {
        const v = (await verifyRes.json()) as { sub?: string; name?: string }
        sub = v.sub ?? null
        displayName = v.name ?? null
      }
    } catch {
      /* fallthrough to profile */
    }
  }
  // id_token から取れない場合は access_token で /v2/profile を引く
  if (!sub && tokenJson.access_token) {
    try {
      const profRes = await fetch("https://api.line.me/v2/profile", {
        headers: { Authorization: `Bearer ${tokenJson.access_token}` },
      })
      if (profRes.ok) {
        const p = (await profRes.json()) as { userId?: string; displayName?: string }
        sub = p.userId ?? null
        displayName = displayName ?? p.displayName ?? null
      }
    } catch {
      /* noop */
    }
  }

  if (!sub) return fail(request, "no_userid")

  // 4. 紐付け
  const email = (session?.user as { email?: string } | undefined)?.email ?? null
  const bindResult = await bindLineUserToAccount({
    userId: sessionUserId,
    lineUserId: sub,
    displayName,
    email,
  })
  if (!bindResult.ok) return fail(request, "already_linked")

  // Cookie を破棄して完了画面へ（new Response でヘッダを組み立てる）
  return new Response(null, {
    status: 302,
    headers: {
      Location: `${baseUrl(request)}/mypage?line_link=success`,
      "Set-Cookie": "line_link_state=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0",
    },
  })
}

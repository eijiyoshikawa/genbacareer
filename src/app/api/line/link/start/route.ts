/**
 * GET /api/line/link/start
 *
 * ログイン中の求職者を LINE ログイン(OAuth)へ誘導し、アカウント連携を開始する。
 * 現在の userId を署名付き state に載せ、コールバックで確実に本人へ紐付ける（link-by-session）。
 *
 * bot_prompt=aggressive: LINE ログインチャネルに公式アカウントをリンクしておくと、
 * 連携と同時に友だち追加が促され、その後 Push 送信が可能になる。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { signLinkState } from "@/lib/line-link"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

function baseUrl(request: NextRequest): string {
  return (
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${request.nextUrl.protocol}//${request.nextUrl.host}`
  )
}

export async function GET(request: NextRequest) {
  const session = await auth().catch(() => null)
  const userId = (session?.user as { id?: string } | undefined)?.id
  if (!userId) {
    // 未ログインはログインへ（戻り先に連携開始を仕込む）
    return Response.redirect(`${baseUrl(request)}/login?callbackUrl=/api/line/link/start`)
  }

  const clientId = process.env.LINE_CLIENT_ID
  if (!clientId) {
    return Response.redirect(`${baseUrl(request)}/mypage?line_link=unconfigured`)
  }

  const state = signLinkState(userId)
  const redirectUri = `${baseUrl(request)}/api/line/link/callback`

  const authorizeUrl = new URL("https://access.line.me/oauth2/v2.1/authorize")
  authorizeUrl.searchParams.set("response_type", "code")
  authorizeUrl.searchParams.set("client_id", clientId)
  authorizeUrl.searchParams.set("redirect_uri", redirectUri)
  authorizeUrl.searchParams.set("state", state)
  authorizeUrl.searchParams.set("scope", "openid profile")
  // 公式アカウント友だち追加を同時に促す（チャネルに OA リンク設定が必要）
  authorizeUrl.searchParams.set("bot_prompt", "aggressive")

  // CSRF 二重送信防御として state を httpOnly Cookie にも保存
  // （Response.redirect はヘッダが immutable なため new Response で組み立てる）
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorizeUrl.toString(),
      "Set-Cookie": `line_link_state=${encodeURIComponent(state)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    },
  })
}

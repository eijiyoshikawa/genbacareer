/**
 * LIFF (LINE Front-end Framework) サーバ側ヘルパー。
 *
 * LIFF クライアントから送られてくる accessToken を LINE 公式の verify API で
 * 検証し、なりすましを防ぐ。client_id（= Channel ID）が想定値と一致するかも確認。
 *
 * @see https://developers.line.biz/ja/reference/liff-server/
 */

const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"
const PROFILE_URL = "https://api.line.me/v2/profile"

function getLiffChannelId(): string {
  return process.env.LIFF_CHANNEL_ID ?? process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID ?? ""
}

export function isLiffServerConfigured(): boolean {
  return !!getLiffChannelId()
}

export interface LiffVerifyResult {
  ok: boolean
  clientId?: string
  expiresIn?: number
  reason?: string
}

export async function verifyLiffAccessToken(token: string): Promise<LiffVerifyResult> {
  if (!token) return { ok: false, reason: "empty_token" }
  try {
    const res = await fetch(`${VERIFY_URL}?access_token=${encodeURIComponent(token)}`, {
      method: "GET",
      cache: "no-store",
    })
    if (!res.ok) {
      return { ok: false, reason: `http_${res.status}` }
    }
    const json = (await res.json()) as {
      client_id?: string
      expires_in?: number
      scope?: string
    }
    const expected = getLiffChannelId()
    if (expected && json.client_id !== expected) {
      // Channel ID が一致しないトークンは別アプリ由来 → 拒否
      return { ok: false, reason: "client_id_mismatch", clientId: json.client_id }
    }
    if (typeof json.expires_in === "number" && json.expires_in <= 0) {
      return { ok: false, reason: "expired" }
    }
    return { ok: true, clientId: json.client_id, expiresIn: json.expires_in }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" }
  }
}

export interface LiffProfile {
  userId: string
  displayName?: string
}

/**
 * accessToken の持ち主本人の LINE プロフィールを取得する。
 *
 * verifyLiffAccessToken はチャネル (client_id) の一致しか確認せず、
 * トークンの持ち主が誰かは分からない。lineUserId をクライアント入力の
 * まま信用すると、有効な自分の accessToken を使って任意の他人の
 * lineUserId を詐称できてしまう（その ID 宛に push メッセージが飛ぶ /
 * その ID 名義で応募が作られる）。
 * 呼び出し側は、ここで取得した userId を信頼できる値として使うこと。
 */
export async function getLiffProfile(token: string): Promise<LiffProfile | null> {
  if (!token) return null
  try {
    const res = await fetch(PROFILE_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = (await res.json()) as { userId?: string; displayName?: string }
    if (!json.userId) return null
    return { userId: json.userId, displayName: json.displayName }
  } catch {
    return null
  }
}

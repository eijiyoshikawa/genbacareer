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

/**
 * accessToken の持ち主本人の LINE userId を取得する。
 *
 * verifyLiffAccessToken はトークンの有効性と発行元チャネルしか確認しないため、
 * 「有効な自分の accessToken + 他人の lineUserId」を送るなりすましを防げない。
 * クライアントが送ってきた lineUserId は必ずこの戻り値と突き合わせて検証すること。
 */
export async function getLiffUserId(accessToken: string): Promise<string | null> {
  if (!accessToken) return null
  try {
    const res = await fetch(PROFILE_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = (await res.json()) as { userId?: string }
    return json.userId ?? null
  } catch {
    return null
  }
}

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
  /** トークンの持ち主として LINE が返す実際の userId。呼び出し側は
   *  クライアント申告の lineUserId とここを突き合わせてなりすましを検出する。 */
  userId?: string
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

    // verify API はトークンの有効性のみを保証し、誰の userId かは返さない。
    // クライアントが申告する lineUserId が本当にこのトークンの持ち主か、
    // profile API を叩いて突き合わせる (なりすまし防止の本体)。
    const profileRes = await fetch(PROFILE_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!profileRes.ok) {
      return { ok: false, reason: `profile_http_${profileRes.status}` }
    }
    const profile = (await profileRes.json()) as { userId?: string }
    if (!profile.userId) {
      return { ok: false, reason: "profile_missing_user_id" }
    }

    return {
      ok: true,
      clientId: json.client_id,
      expiresIn: json.expires_in,
      userId: profile.userId,
    }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" }
  }
}

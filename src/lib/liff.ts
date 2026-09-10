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
  userId?: string
}

/**
 * accessToken の実際の持ち主（LINE userId）を LINE プロフィール API で取得する。
 * verify エンドポイントはトークンの真正性のみを確認し、誰のものかは返さないため、
 * なりすまし防止にはこちらが必須。
 */
async function fetchProfileUserId(token: string): Promise<string | null> {
  try {
    const res = await fetch(PROFILE_URL, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = (await res.json()) as { userId?: string }
    return json.userId ?? null
  } catch {
    return null
  }
}

/**
 * @param expectedUserId 渡された場合、accessToken の実際の持ち主がこの
 *   lineUserId と一致するかまで確認する。これが無いと、正規の（別人の）
 *   accessToken を使い回すだけで任意の lineUserId になりすませてしまう
 *   （lead の帰属偽装 / 他人への LINE push 送りつけ）。
 */
export async function verifyLiffAccessToken(
  token: string,
  expectedUserId?: string
): Promise<LiffVerifyResult> {
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

    if (expectedUserId) {
      const ownerId = await fetchProfileUserId(token)
      if (!ownerId || ownerId !== expectedUserId) {
        return { ok: false, reason: "user_id_mismatch" }
      }
      return {
        ok: true,
        clientId: json.client_id,
        expiresIn: json.expires_in,
        userId: ownerId,
      }
    }

    return { ok: true, clientId: json.client_id, expiresIn: json.expires_in }
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : "unknown" }
  }
}

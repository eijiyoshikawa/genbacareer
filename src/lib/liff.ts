/**
 * LIFF (LINE Front-end Framework) サーバ側ヘルパー。
 *
 * LIFF クライアントから送られてくる accessToken を LINE 公式の verify API で
 * 検証し、なりすましを防ぐ。client_id（= Channel ID）が想定値と一致するかも確認。
 *
 * @see https://developers.line.biz/ja/reference/liff-server/
 */

const VERIFY_URL = "https://api.line.me/oauth2/v2.1/verify"

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

const PROFILE_URL = "https://api.line.me/v2/profile"

/**
 * accessToken の持ち主の LINE userId を LINE 本体から取得する。
 *
 * /oauth2/v2.1/verify が返すのは client_id / expires_in / scope だけで userId は
 * 含まれない。そのためリクエストボディの lineUserId をそのまま信じると、
 * 同一チャネルの正規トークンさえあれば他人の LINE ID を騙れてしまう
 * （他人名義の lead 作成 + 本人が送っていない応募 Push の送信）。
 * userId は必ずこの関数の戻り値を正とし、クライアント申告値は使わない。
 *
 * 失敗時は null。呼び出し側は「LINE 紐付けなしで保存」に倒すこと
 * （応募自体を落とすと本流のファネルが壊れるため）。
 */
export async function fetchLiffUserId(token: string): Promise<string | null> {
  if (!token) return null
  try {
    const res = await fetch(PROFILE_URL, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    })
    if (!res.ok) return null
    const json = (await res.json()) as { userId?: unknown }
    return typeof json.userId === "string" && json.userId ? json.userId : null
  } catch {
    return null
  }
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

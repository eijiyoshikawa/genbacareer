/**
 * マネーフォワード クラウド請求書 API クライアント
 *
 * https://invoice.moneyforward.com/docs/api/v3/index.html
 *
 * 認証: OAuth2 Client Credentials Grant（B2B 用途のため refresh token は不要）
 * - .env: MF_CLIENT_ID / MF_CLIENT_SECRET / MF_OFFICE_ID
 *
 * 2026-05 以降、課金プロバイダはマネフォ一本化。必要最小限の機能のみ実装：
 *   - 取引先（partner）登録
 *   - 請求書（billing）作成・送付
 */

const MF_API_BASE = "https://invoice.moneyforward.com/api/v3"
const MF_OAUTH_BASE = "https://api.biz.moneyforward.com"

let _accessToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(): Promise<string> {
  if (_accessToken && _accessToken.expiresAt > Date.now() + 60_000) {
    return _accessToken.value
  }

  const clientId = process.env.MF_CLIENT_ID
  const clientSecret = process.env.MF_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error("MF_CLIENT_ID / MF_CLIENT_SECRET is not set")
  }

  const res = await fetch(`${MF_OAUTH_BASE}/authorize/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "mfc/invoice/data.write mfc/invoice/data.read",
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MF token request failed: ${res.status} ${text}`)
  }

  const data = (await res.json()) as { access_token: string; expires_in: number }
  _accessToken = {
    value: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  }
  return data.access_token
}

async function mfFetch<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken()
  const res = await fetch(`${MF_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`MF API ${path} failed: ${res.status} ${text}`)
  }
  return (await res.json()) as T
}

// ============================================================================
// Partners (取引先)
// ============================================================================

export type MfPartner = {
  id: string
  name: string
  email?: string
}

export async function createMfPartner(args: {
  name: string
  email?: string
}): Promise<MfPartner> {
  return mfFetch<MfPartner>("/partners", {
    method: "POST",
    body: JSON.stringify({
      partner: {
        name: args.name,
        ...(args.email
          ? { contact_email: args.email, email_to: args.email }
          : {}),
      },
    }),
  })
}

// ============================================================================
// Billings (請求書)
// ============================================================================

export type MfBilling = {
  id: string
  pdf_url?: string
  web_url?: string
  document_url?: string
}

/**
 * 請求書を作成して即時 PDF 化 + メール送付する。
 *
 * @param args.partnerId   MF 側の取引先 ID
 * @param args.title       請求書タイトル（例: 「成果報酬請求書」）
 * @param args.itemName    品目名（例: 成果報酬 — 求人タイトル）
 * @param args.amount      金額（税抜・円）
 * @param args.daysUntilDue 支払期日までの日数（デフォルト 30）
 * @param args.metadata    BillingEvent との紐付け用に memo として保存
 */
/**
 * JST の暦日 (YYYY-MM-DD) を返す。
 * `Date#toISOString().slice(0, 10)` は UTC 暦日を返すため、日本時間の
 * 0:00〜8:59 に実行すると請求書の日付が 1 日前にずれてしまう。
 */
export function toJstDateString(d: Date): string {
  const jst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return jst.toISOString().slice(0, 10)
}

export async function createMfBilling(args: {
  partnerId: string
  title: string
  itemName: string
  amount: number
  daysUntilDue?: number
  metadata?: Record<string, string>
}): Promise<MfBilling> {
  const officeId = process.env.MF_OFFICE_ID
  if (!officeId) throw new Error("MF_OFFICE_ID is not set")

  const billingDate = new Date()
  const dueDate = new Date(
    billingDate.getTime() +
      (args.daysUntilDue ?? 30) * 24 * 60 * 60 * 1000
  )

  const memo = args.metadata
    ? Object.entries(args.metadata)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : undefined

  return mfFetch<MfBilling>("/billings", {
    method: "POST",
    body: JSON.stringify({
      billing: {
        office_id: officeId,
        partner_id: args.partnerId,
        title: args.title,
        billing_date: toJstDateString(billingDate),
        due_date: toJstDateString(dueDate),
        memo,
        items: [
          {
            name: args.itemName,
            unit_price: args.amount,
            quantity: 1,
            // 内税で消費税 10%（業務委託・成果報酬は課税対象）
            excise: "ten_percent",
          },
        ],
      },
    }),
  })
}

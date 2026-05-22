/**
 * 9.6 Search Console (GSC) API クライアント。
 *
 * 認証方式は 2 系統サポート (リフレッシュトークンを優先):
 *
 *  A) OAuth User Refresh Token (推奨。オーナーユーザーの認可をそのまま使う)
 *     - GSC_OAUTH_CLIENT_ID
 *     - GSC_OAUTH_CLIENT_SECRET
 *     - GSC_OAUTH_REFRESH_TOKEN
 *
 *  B) Service Account JWT
 *     - GSC_SERVICE_ACCOUNT_EMAIL
 *     - GSC_SERVICE_ACCOUNT_PRIVATE_KEY
 *
 *  共通:
 *     - GSC_SITE_URL  例: "https://www.genbacareer.jp/" または "sc-domain:genbacareer.jp"
 */

import crypto from "node:crypto"

const TOKEN_URL = "https://oauth2.googleapis.com/token"
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly"

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input
  return buf
    .toString("base64")
    .replace(/=+$/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
}

function normalizePrivateKey(raw: string): string {
  if (raw.includes("\\n")) return raw.replace(/\\n/g, "\n")
  return raw
}

async function getAccessTokenViaRefreshToken(): Promise<string> {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("GSC OAuth refresh token credentials are not configured")
  }
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`GSC OAuth refresh failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error("GSC OAuth response missing access_token")
  return data.access_token
}

async function getAccessTokenViaServiceAccount(): Promise<string> {
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL
  const privateKeyRaw = process.env.GSC_SERVICE_ACCOUNT_PRIVATE_KEY
  if (!email || !privateKeyRaw) {
    throw new Error("GSC service account credentials are not configured")
  }
  const privateKey = normalizePrivateKey(privateKeyRaw)

  const iat = Math.floor(Date.now() / 1000)
  const exp = iat + 3600
  const header = { alg: "RS256", typ: "JWT" }
  const claims = {
    iss: email,
    scope: SCOPE,
    aud: TOKEN_URL,
    exp,
    iat,
  }
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(
    JSON.stringify(claims)
  )}`
  const signer = crypto.createSign("RSA-SHA256")
  signer.update(signingInput)
  const signature = base64url(signer.sign(privateKey))
  const jwt = `${signingInput}.${signature}`

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }).toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`GSC token request failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as { access_token?: string }
  if (!data.access_token) throw new Error("GSC token response missing access_token")
  return data.access_token
}

export async function getGscAccessToken(): Promise<string> {
  // OAuth リフレッシュトークンが設定されていればそちらを優先
  if (process.env.GSC_OAUTH_REFRESH_TOKEN) {
    return getAccessTokenViaRefreshToken()
  }
  return getAccessTokenViaServiceAccount()
}

export type GscRow = {
  query: string
  page: string
  clicks: number
  impressions: number
  ctr: number
  position: number
}

export async function querySearchAnalytics({
  siteUrl,
  startDate,
  endDate,
  rowLimit = 1000,
}: {
  siteUrl: string
  startDate: string
  endDate: string
  rowLimit?: number
}): Promise<GscRow[]> {
  const token = await getGscAccessToken()
  const encoded = encodeURIComponent(siteUrl)
  const url = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      startDate,
      endDate,
      dimensions: ["query", "page"],
      rowLimit,
      dataState: "all",
    }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => "")
    throw new Error(`GSC query failed: ${res.status} ${text}`)
  }
  const data = (await res.json()) as {
    rows?: Array<{
      keys: [string, string]
      clicks: number
      impressions: number
      ctr: number
      position: number
    }>
  }
  return (data.rows ?? []).map((r) => ({
    query: r.keys[0],
    page: r.keys[1],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: r.ctr,
    position: r.position,
  }))
}

/**
 * LINE Messaging API クライアント。
 *
 * Channel Access Token / Channel Secret を環境変数から取得し、
 * - Webhook 署名検証
 * - Reply / Push メッセージ送信
 * - ユーザープロフィール取得
 * - Rich Menu 作成 / 配信
 * を最小限の依存で実装する（@line/bot-sdk は使わず fetch + Node crypto のみ）。
 *
 * 環境変数:
 *   LINE_CHANNEL_ACCESS_TOKEN — Messaging API のチャネルトークン
 *   LINE_CHANNEL_SECRET       — 署名検証用シークレット
 */

import crypto from "node:crypto"

const API_BASE = "https://api.line.me"
const DATA_API_BASE = "https://api-data.line.me"

// 環境変数はモジュール読み込み時にキャプチャせず、呼び出し時に毎回参照する。
// （スクリプトから .env.local を後から読み込むパターンを正しく扱うため）
function getToken(): string {
  return process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ""
}
function getSecret(): string {
  return process.env.LINE_CHANNEL_SECRET ?? ""
}

export function isMessagingConfigured(): boolean {
  return !!getToken() && !!getSecret()
}

/**
 * LINE Webhook の署名（X-Line-Signature ヘッダ）を検証する。
 * @param rawBody 受信した生 body（JSON.parse する前の文字列）
 * @param signature ヘッダから取り出した X-Line-Signature 値
 */
export function verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
  if (!getSecret() || !signature) return false
  const hmac = crypto.createHmac("sha256", getSecret())
  hmac.update(rawBody)
  const expected = hmac.digest("base64")
  // timingSafeEqual は等長必須。長さ不一致は即 false。
  if (expected.length !== signature.length) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    )
  } catch {
    return false
  }
}

type TextMessage = { type: "text"; text: string }

// === Flex Message ====================================================
// LINE Messaging API の Flex Message。bubble / carousel をサポート。
// 詳細: https://developers.line.biz/ja/docs/messaging-api/using-flex-messages/

export type FlexText = {
  type: "text"
  text: string
  size?: "xxs" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
  weight?: "regular" | "bold"
  color?: string
  wrap?: boolean
  align?: "start" | "center" | "end"
  margin?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
  decoration?: "none" | "underline" | "line-through"
}
export type FlexBox = {
  type: "box"
  layout: "vertical" | "horizontal" | "baseline"
  contents: FlexComponent[]
  spacing?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
  margin?: "none" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl"
  paddingAll?: string
  backgroundColor?: string
}
export type FlexButton = {
  type: "button"
  action:
    | { type: "uri"; label: string; uri: string }
    | { type: "message"; label: string; text: string }
    | { type: "postback"; label: string; data: string }
  style?: "primary" | "secondary" | "link"
  color?: string
  height?: "sm" | "md"
}
export type FlexImage = {
  type: "image"
  url: string
  size?: "full" | "xs" | "sm" | "md" | "lg" | "xl" | "xxl" | "3xl" | "4xl" | "5xl"
  aspectMode?: "cover" | "fit"
  aspectRatio?: string
  action?: { type: "uri"; uri: string; label?: string }
}
export type FlexFiller = { type: "filler" }
export type FlexSeparator = { type: "separator"; margin?: string; color?: string }
export type FlexComponent = FlexText | FlexBox | FlexButton | FlexImage | FlexFiller | FlexSeparator

export type FlexBubble = {
  type: "bubble"
  hero?: FlexImage
  body?: FlexBox
  footer?: FlexBox
  size?: "nano" | "micro" | "kilo" | "mega" | "giga"
}
export type FlexCarousel = {
  type: "carousel"
  contents: FlexBubble[]
}
export type FlexMessage = {
  type: "flex"
  altText: string
  contents: FlexBubble | FlexCarousel
}

export type LineMessage = TextMessage | FlexMessage

async function callApi(path: string, init: RequestInit, base = API_BASE): Promise<Response> {
  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      ...(init.headers ?? {}),
    },
  })
}

/** replyToken に対して返信する。Webhook 受信から 30 秒以内が有効期限。 */
export async function replyMessage(replyToken: string, messages: LineMessage[]): Promise<void> {
  if (!getToken()) return
  const res = await callApi("/v2/bot/message/reply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ replyToken, messages }),
  })
  if (!res.ok) {
    console.warn("[line.reply] failed", res.status, await res.text().catch(() => ""))
  }
}

/** 任意の LINE ユーザーへプッシュ送信（要 Messaging API 有効化 + 同意済み友だち）。 */
export async function pushMessage(to: string, messages: LineMessage[]): Promise<void> {
  if (!getToken()) return
  const res = await callApi("/v2/bot/message/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ to, messages }),
  })
  if (!res.ok) {
    console.warn("[line.push] failed", res.status, await res.text().catch(() => ""))
  }
}

export interface LineUserProfile {
  userId: string
  displayName: string
  pictureUrl?: string
  language?: string
}

export async function getUserProfile(userId: string): Promise<LineUserProfile | null> {
  if (!getToken()) return null
  const res = await callApi(`/v2/bot/profile/${encodeURIComponent(userId)}`, {
    method: "GET",
  })
  if (!res.ok) return null
  return res.json() as Promise<LineUserProfile>
}

// === Rich Menu ============================================================

export interface RichMenuBounds {
  x: number
  y: number
  width: number
  height: number
}

export interface RichMenuArea {
  bounds: RichMenuBounds
  action:
    | { type: "uri"; uri: string; label?: string }
    | { type: "message"; text: string; label?: string }
    | { type: "postback"; data: string; label?: string }
}

export interface RichMenuDefinition {
  size: { width: number; height: number }
  selected: boolean
  name: string
  chatBarText: string
  areas: RichMenuArea[]
}

export async function createRichMenu(def: RichMenuDefinition): Promise<string | null> {
  if (!getToken()) return null
  const res = await callApi("/v2/bot/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(def),
  })
  if (!res.ok) {
    console.warn("[line.richmenu.create] failed", res.status, await res.text().catch(() => ""))
    return null
  }
  const json = (await res.json()) as { richMenuId: string }
  return json.richMenuId
}

export async function uploadRichMenuImage(
  richMenuId: string,
  imageBuffer: Buffer,
  contentType: "image/png" | "image/jpeg" = "image/png"
): Promise<boolean> {
  if (!getToken()) return false
  const res = await fetch(
    `${DATA_API_BASE}/v2/bot/richmenu/${encodeURIComponent(richMenuId)}/content`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
        "Content-Type": contentType,
      },
      // Node.js fetch は Buffer をそのまま受け付ける
      body: imageBuffer as unknown as BodyInit,
    }
  )
  if (!res.ok) {
    console.warn("[line.richmenu.upload] failed", res.status, await res.text().catch(() => ""))
    return false
  }
  return true
}

/** 全員に同じ Rich Menu を適用するデフォルト割り当て。 */
export async function setDefaultRichMenu(richMenuId: string): Promise<boolean> {
  if (!getToken()) return false
  const res = await callApi(`/v2/bot/user/all/richmenu/${encodeURIComponent(richMenuId)}`, {
    method: "POST",
  })
  if (!res.ok) {
    console.warn("[line.richmenu.setDefault] failed", res.status, await res.text().catch(() => ""))
    return false
  }
  return true
}

export async function listRichMenus(): Promise<Array<{ richMenuId: string; name: string }>> {
  if (!getToken()) return []
  const res = await callApi("/v2/bot/richmenu/list", { method: "GET" })
  if (!res.ok) return []
  const json = (await res.json()) as { richmenus: Array<{ richMenuId: string; name: string }> }
  return json.richmenus
}

export async function deleteRichMenu(richMenuId: string): Promise<boolean> {
  if (!getToken()) return false
  const res = await callApi(`/v2/bot/richmenu/${encodeURIComponent(richMenuId)}`, {
    method: "DELETE",
  })
  return res.ok
}

/**
 * LINE Flex Message テンプレート。
 *
 * 通知系メッセージ（応募ステータス変更 / スカウト受信 / 新着求人 / 汎用）を
 * ブランド統一されたリッチな見た目で配信する。
 *
 * デザイン方針:
 *   - ヘッダ帯: ゲンバキャリア緑 + 通知種別ラベル
 *   - 本文: タイトル + 説明 + 最大 3 行のリスト
 *   - フッタ: 1 〜 2 個のアクションボタン（CTA）
 */

import type {
  FlexBubble,
  FlexBox,
  FlexComponent,
  FlexMessage,
} from "@/lib/line-messaging"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://genbacareer.jp"

const BRAND_GREEN = "#16a34a"
const BRAND_BG = "#f0fdf4"
const TEXT_DARK = "#111111"
const TEXT_GRAY = "#555555"
const TEXT_MUTED = "#888888"

export type FlexNotificationKind =
  | "application_status"
  | "scout_received"
  | "saved_search_alert"
  | "system"
  | "promo"

const KIND_LABEL: Record<FlexNotificationKind, string> = {
  application_status: "選考お知らせ",
  scout_received: "スカウト",
  saved_search_alert: "新着求人",
  system: "お知らせ",
  promo: "おすすめ",
}

const KIND_ACCENT: Record<FlexNotificationKind, string> = {
  application_status: BRAND_GREEN,
  scout_received: "#7c3aed",
  saved_search_alert: "#0ea5e9",
  system: "#475569",
  promo: "#f59e0b",
}

function absoluteUrl(linkUrl: string | undefined | null): string {
  if (!linkUrl) return `${SITE_URL}/mypage/notifications`
  if (linkUrl.startsWith("http")) return linkUrl
  return `${SITE_URL}${linkUrl}`
}

/**
 * 1 件の通知を Flex Message にする。
 * - body にリスト形式（複数行 1 行ずつ）を含めたい場合は items を渡す
 */
export function buildNotificationFlex(input: {
  kind: FlexNotificationKind
  title: string
  body?: string | null
  items?: string[]
  linkUrl?: string | null
  linkLabel?: string
}): FlexMessage {
  const accent = KIND_ACCENT[input.kind]
  const kindLabel = KIND_LABEL[input.kind]
  const url = absoluteUrl(input.linkUrl)
  const linkLabel = input.linkLabel ?? "詳細を見る"

  const bodyContents: FlexComponent[] = [
    {
      type: "text",
      text: input.title,
      weight: "bold",
      size: "md",
      color: TEXT_DARK,
      wrap: true,
    },
  ]

  if (input.body) {
    bodyContents.push({
      type: "text",
      text: input.body,
      size: "sm",
      color: TEXT_GRAY,
      wrap: true,
      margin: "sm",
    })
  }

  if (input.items && input.items.length > 0) {
    const itemBox: FlexBox = {
      type: "box",
      layout: "vertical",
      spacing: "xs",
      margin: "md",
      paddingAll: "8px",
      backgroundColor: BRAND_BG,
      contents: input.items.slice(0, 3).map((item) => ({
        type: "text",
        text: `• ${item}`,
        size: "xs",
        color: TEXT_DARK,
        wrap: true,
      })),
    }
    if (input.items.length > 3) {
      itemBox.contents.push({
        type: "text",
        text: `他 ${input.items.length - 3} 件`,
        size: "xs",
        color: TEXT_MUTED,
      })
    }
    bodyContents.push(itemBox)
  }

  const bubble: FlexBubble = {
    type: "bubble",
    size: "kilo",
    body: {
      type: "box",
      layout: "vertical",
      contents: [
        {
          type: "box",
          layout: "horizontal",
          paddingAll: "8px",
          backgroundColor: accent,
          contents: [
            {
              type: "text",
              text: "ゲンバキャリア",
              size: "xxs",
              color: "#ffffff",
              weight: "bold",
            },
            {
              type: "text",
              text: kindLabel,
              size: "xxs",
              color: "#ffffff",
              align: "end",
            },
          ],
        },
        {
          type: "box",
          layout: "vertical",
          paddingAll: "12px",
          spacing: "sm",
          contents: bodyContents,
        },
      ],
    },
    footer: {
      type: "box",
      layout: "vertical",
      paddingAll: "8px",
      spacing: "sm",
      contents: [
        {
          type: "button",
          style: "primary",
          height: "sm",
          color: accent,
          action: {
            type: "uri",
            label: linkLabel,
            uri: url,
          },
        },
      ],
    },
  }

  return {
    type: "flex",
    altText: `${kindLabel}: ${input.title}`.slice(0, 400),
    contents: bubble,
  }
}

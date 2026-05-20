/**
 * 求職者ユーザーが LINE 公式アカウントを友だち追加していて、optedOut でないなら、
 * 通知内容を LINE Push でリアルタイム配信する。
 *
 * 識別方法: User.email と LineLead.email を突き合わせる（最新の lineUserId を採用）。
 * これは「LINE 応募 → 後日サイト登録」「サイト登録 → LINE 友だち追加」両方のケースで動作する。
 *
 * 送信内容: Flex Message（リッチ表示）+ 旧クライアント向けにテキストもフォールバック送信。
 * 失敗・未配信は黙って無視（メール / inbox は別経路で配信済み）。
 */

import { prisma } from "@/lib/db"
import { pushMessage, isMessagingConfigured } from "@/lib/line-messaging"
import {
  buildNotificationFlex,
  type FlexNotificationKind,
} from "@/lib/line-flex-templates"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://genbacareer.jp"

async function findLineUserId(userId: string): Promise<string | null> {
  const user = await prisma.user
    .findUnique({ where: { id: userId }, select: { email: true } })
    .catch(() => null)
  if (!user?.email) return null

  const lead = await prisma.lineLead
    .findFirst({
      where: {
        email: { equals: user.email, mode: "insensitive" },
        lineUserId: { not: null },
        optedOut: false,
      },
      orderBy: { createdAt: "desc" },
      select: { lineUserId: true },
    })
    .catch(() => null)

  return lead?.lineUserId ?? null
}

/**
 * Notification 種別文字列 → Flex のテンプレ種別にマッピング。
 */
function mapKind(type: string | null | undefined): FlexNotificationKind {
  switch (type) {
    case "application_status":
      return "application_status"
    case "scout_received":
      return "scout_received"
    case "saved_search_alert":
    case "saved_search":
      return "saved_search_alert"
    case "promo":
      return "promo"
    default:
      return "system"
  }
}

/**
 * 通知を Flex Message + テキストの 2 メッセージで送信。
 * link は省略可。kind を指定するとラベル・アクセント色を切り替え。
 */
export async function pushUserNotification(input: {
  userId: string
  title: string
  body?: string | null
  items?: string[]
  linkLabel?: string
  linkUrl?: string | null
  kind?: FlexNotificationKind | string | null
}): Promise<void> {
  if (!isMessagingConfigured()) return

  const lineUserId = await findLineUserId(input.userId)
  if (!lineUserId) return

  const kind = mapKind(input.kind)
  const url = input.linkUrl
    ? input.linkUrl.startsWith("http")
      ? input.linkUrl
      : `${SITE_URL}${input.linkUrl}`
    : `${SITE_URL}/mypage/notifications`
  const linkLabel = input.linkLabel ?? "詳細を見る"

  const flex = buildNotificationFlex({
    kind,
    title: input.title,
    body: input.body ?? null,
    items: input.items,
    linkUrl: input.linkUrl,
    linkLabel,
  })

  // テキストはアクセシビリティ用 fallback。Flex 対応してない古い LINE クライアント
  // でも内容が伝わるようにする。
  const itemBlock =
    input.items && input.items.length > 0
      ? `\n${input.items.slice(0, 3).map((x) => `・${x}`).join("\n")}${input.items.length > 3 ? `\n他 ${input.items.length - 3} 件` : ""}`
      : ""
  const textFallback = input.body
    ? `${input.title}\n\n${input.body}${itemBlock}\n\n${linkLabel}: ${url}`
    : `${input.title}${itemBlock}\n\n${linkLabel}: ${url}`

  try {
    await pushMessage(lineUserId, [flex, { type: "text", text: textFallback }])
  } catch (e) {
    console.warn(
      `[line-push-notifier] failed: ${e instanceof Error ? e.message : e}`
    )
  }
}

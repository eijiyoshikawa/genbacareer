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

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

async function findLineUserId(userId: string): Promise<string | null> {
  const user = await prisma.user
    .findUnique({ where: { id: userId }, select: { lineUserId: true } })
    .catch(() => null)
  if (!user) return null

  // 送信先は本人が LINE ログイン / LINE 連携で確認済みの User.lineUserId のみ。
  // 以前は email が一致する LineLead にもフォールバックしていたが、LineLead の email は
  // 公開の応募フォームに自由入力された未確認の値で、他人のアドレスを入れて応募すれば
  // その人宛の通知 (選考結果・スカウト等) を自分の LINE で受け取れてしまっていた。
  return user.lineUserId ?? null
}

/**
 * Notification 種別文字列 → Flex のテンプレ種別にマッピング。
 */
function mapKind(type: string | null | undefined): FlexNotificationKind {
  switch (type) {
    case "application_status":
      return "application_status"
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
 * pushUserNotification の結果種別。
 * - "sent": LINE API 呼び出しが成功した
 * - "no_recipient": 友だち未連携 / 未設定など、そもそも送り先が無い（恒常的な状態）
 * - "failed": 送り先はあったが LINE API 呼び出しが失敗した（一時的な障害の可能性）
 * 呼び出し側（cron の再送判定など）が "no_recipient" と "failed" を区別できるよう
 * boolean ではなく種別を返す。
 */
export type PushResult = "sent" | "no_recipient" | "failed"

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
}): Promise<PushResult> {
  if (!isMessagingConfigured()) return "no_recipient"

  const lineUserId = await findLineUserId(input.userId)
  if (!lineUserId) return "no_recipient"

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
    return "sent"
  } catch (e) {
    console.warn(
      `[line-push-notifier] failed: ${e instanceof Error ? e.message : e}`
    )
    return "failed"
  }
}

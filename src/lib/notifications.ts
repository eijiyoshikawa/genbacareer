/**
 * 求職者向け通知の作成 / 既読化ヘルパー。
 *
 * Notification は inbox 表示専用なので、DB 接続不能や userId が無い場合は
 * 黙って失敗する（フローを止めないため）。
 */

import { prisma } from "@/lib/db"
import { pushUserNotification } from "@/lib/line-push-notifier"
import { parsePrefs, isInQuietHours } from "@/lib/notification-prefs"

export type NotificationType =
  | "application_status"
  | "scout"
  | "system"
  | "promo"

const STATUS_NOTIFICATION_TITLE: Record<string, string> = {
  reviewing: "選考が開始されました",
  interview: "面接日程のご案内",
  offered: "内定のお知らせ",
  hired: "採用決定のお知らせ",
  rejected: "選考結果のお知らせ",
}

const STATUS_NOTIFICATION_BODY: Record<string, string> = {
  reviewing: "ご応募内容を確認し、書類選考を開始しました。",
  interview: "書類選考を通過いたしました。面接日程を担当者と調整してください。",
  offered: "選考通過おめでとうございます。内定のご案内をお送りしました。",
  hired: "正式採用となりました。今後の手続きについて、担当者よりご連絡いたします。",
  rejected:
    "ご応募ありがとうございました。今回はご縁が叶わない結果となりました。他の求人もご確認ください。",
}

/**
 * 単一の通知を作成し、紐付いた LINE 友だちにも push する。
 *
 * - inbox 行の作成失敗は警告ログのみで握り潰す（フローを止めない）
 * - LINE Push は最良努力 (best effort)、友だちが見つからなければスキップ
 */
export async function createNotification(input: {
  userId: string
  type: NotificationType
  title: string
  body?: string | null
  items?: string[]
  linkUrl?: string | null
  linkLabel?: string
  refId?: string | null
}): Promise<void> {
  // inbox 行は通知設定に関わらず常に作成 (ユーザーが履歴を後から見られるように)
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        linkUrl: input.linkUrl ?? null,
        refId: input.refId ?? null,
      },
    })
  } catch (e) {
    console.warn(`[notifications] create failed: ${e instanceof Error ? e.message : e}`)
  }

  // 3.4 ユーザーの通知設定を取得
  const user = await prisma.user
    .findUnique({
      where: { id: input.userId },
      select: { notificationPrefs: true },
    })
    .catch(() => null)
  const prefs = parsePrefs(user?.notificationPrefs)

  // 静音時間帯ならプッシュ系をスキップ (inbox には残る)
  if (isInQuietHours(prefs)) return

  // frequency (daily/weekly) によるまとめ配信バッチは未実装。以前は
  // frequency === "immediate" の場合のみ push しており、daily/weekly を
  // 選んだユーザーは LINE 通知を一切受け取れないまま気付けない状態が
  // 続いていた（設定 UI は「1日1回/週1回まとめて配信」と案内しており、
  // ユーザーは配信されると期待している）。まとめ配信が実装されるまでの
  // 間、選択に関わらず即時配信にフォールバックする
  // （何も届かないより、頻度が期待と違っても届く方が実害が小さいため）。
  if (prefs.lineEnabled) {
    pushUserNotification({
      userId: input.userId,
      title: input.title,
      body: input.body,
      items: input.items,
      linkUrl: input.linkUrl,
      linkLabel: input.linkLabel,
      kind: input.type,
    }).catch((e) => {
      console.warn(
        `[notifications] line push failed: ${e instanceof Error ? e.message : e}`
      )
    })
  }
}

/**
 * 応募ステータス遷移時に、求職者へ通知を 1 件作成する。
 * 未対応ステータス（applied 等）の場合は何もしない。
 */
export async function notifyApplicationStatusChange(input: {
  userId: string
  applicationId: string
  newStatus: string
  jobTitle: string
}): Promise<void> {
  const title = STATUS_NOTIFICATION_TITLE[input.newStatus]
  if (!title) return
  const body = STATUS_NOTIFICATION_BODY[input.newStatus] ?? null
  await createNotification({
    userId: input.userId,
    type: "application_status",
    title: `${title}: ${input.jobTitle}`,
    body,
    linkUrl: `/mypage/applications`,
    refId: input.applicationId,
  })
}


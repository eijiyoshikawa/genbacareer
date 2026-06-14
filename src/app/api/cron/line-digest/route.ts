/**
 * GET /api/cron/line-digest?mode=daily|weekly
 *
 * 通知頻度を「1日1回まとめ(daily)」「週1回まとめ(weekly)」に設定している求職者へ、
 * 未送信(line_pushed_at IS NULL)の通知を 1 通の LINE ダイジェストにまとめて Push する。
 *
 * 即時配信(immediate)ユーザーは createNotification がその場で Push 済み
 * (かつ line_pushed_at マーク済み)なので本 cron の対象外。
 *
 * 冪等性: 実行開始時刻 startedAt を cutoff とし、それ以前に作成された未送信通知のみ
 *         まとめて送信→マークする。送信後に作られた通知は次回実行へ回る。
 *
 * Authorization: Bearer ${CRON_SECRET}（未設定時も拒否）
 */

import { prisma } from "@/lib/db"
import { pushUserNotification } from "@/lib/line-push-notifier"
import {
  parsePrefs,
  isInQuietHours,
  type NotificationFrequency,
} from "@/lib/notification-prefs"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const MAX_USERS = 5000 // 1 実行あたりの対象ユーザー上限（タイムアウト保護）
const ITEMS_IN_MESSAGE = 8 // ダイジェスト本文に並べる件名の最大数

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const modeParam = url.searchParams.get("mode")
  const mode: NotificationFrequency = modeParam === "weekly" ? "weekly" : "daily"

  const startedAt = new Date()
  const errors: string[] = []

  // 未送信通知を持つユーザーを抽出（頻度の判定は後段で prefs を見て行う）
  const groups = await prisma.notification.groupBy({
    by: ["userId"],
    where: { linePushedAt: null, createdAt: { lte: startedAt } },
    orderBy: { userId: "asc" },
    take: MAX_USERS,
  })

  let candidates = 0
  let sent = 0
  let skippedFrequency = 0
  let skippedQuiet = 0

  for (const g of groups) {
    candidates++
    const userId = g.userId
    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { notificationPrefs: true },
      })
      const prefs = parsePrefs(user?.notificationPrefs)

      // この実行モード(daily/weekly)に一致し、LINE 有効なユーザーのみ送信
      if (prefs.frequency !== mode || !prefs.lineEnabled) {
        skippedFrequency++
        continue
      }
      // 静音時間帯なら今回は送らず次回実行へ持ち越し（マークしない）
      if (isInQuietHours(prefs, startedAt)) {
        skippedQuiet++
        continue
      }

      // 当該ユーザーの未送信通知（cutoff 以前）を取得
      const rows = await prisma.notification.findMany({
        where: { userId, linePushedAt: null, createdAt: { lte: startedAt } },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { title: true },
      })
      if (rows.length === 0) continue

      const total = rows.length
      const items = rows.slice(0, ITEMS_IN_MESSAGE).map((r) => r.title)
      const label = mode === "weekly" ? "今週" : "今日"

      // 1 通のダイジェストとして LINE Push（友だち未連携なら内部で無送信）
      await pushUserNotification({
        userId,
        title: `📬 ${label}の新着のお知らせ ${total} 件`,
        body:
          total > ITEMS_IN_MESSAGE
            ? `未読の通知が ${total} 件あります（一部を表示）`
            : null,
        items,
        linkUrl: "/mypage/notifications",
        linkLabel: "通知一覧を見る",
        kind: "system",
      })

      // 送信済みとしてマーク（cutoff 以前の未送信を一括）
      await prisma.notification.updateMany({
        where: { userId, linePushedAt: null, createdAt: { lte: startedAt } },
        data: { linePushedAt: startedAt },
      })
      sent++
    } catch (e) {
      errors.push(`user:${userId}: ${e instanceof Error ? e.message : e}`)
    }
  }

  return Response.json({
    ok: true,
    mode,
    durationMs: Date.now() - startedAt.getTime(),
    candidates,
    sent,
    skippedFrequency,
    skippedQuiet,
    errorCount: errors.length,
    errors: errors.slice(0, 20),
  })
}

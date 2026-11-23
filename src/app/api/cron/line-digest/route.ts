/**
 * GET /api/cron/line-digest?mode=daily|weekly
 *
 * 通知頻度を「1日1回まとめ(daily)」「週1回まとめ(weekly)」に設定している求職者へ、
 * 未送信(line_pushed_at IS NULL)の通知を 1 通の LINE ダイジェストにまとめて Push する。
 *
 * 即時配信(immediate)ユーザーは createNotification がその場で Push 済み
 * (かつ line_pushed_at マーク済み)。ただし静音時間帯に作られた通知や Push に失敗した
 * 通知は未送信のまま残るため、daily 実行時に直近分だけ拾って届ける
 * (設定画面の「静音時間の終了後にまとめて配信」に相当)。
 *
 * 実行は毎時 (daily は毎時 30 分、weekly は月曜 UTC の毎時 0 分)。各ユーザーには
 * 配信時刻 (JST 9 時。静音時間に掛かる場合はその終了時刻) の回にだけ送る。
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
  digestHourJst,
  jstHourOf,
  type NotificationFrequency,
} from "@/lib/notification-prefs"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

const MAX_USERS = 5000 // 1 実行あたりの対象ユーザー上限（タイムアウト保護）
const ITEMS_IN_MESSAGE = 8 // ダイジェスト本文に並べる件名の最大数
const DAY_MS = 24 * 60 * 60 * 1000
/** 候補抽出で遡る期間。weekly の 7 日 + 静音・失敗による持ち越し分の余裕。 */
const LOOKBACK_MS = 15 * DAY_MS
/** 即時配信ユーザーの取りこぼし救済で対象にする期間 (古い通知を今さら送らない)。 */
const IMMEDIATE_CATCHUP_MS = 2 * DAY_MS

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

  // 未送信通知を持つ LINE 連携済みユーザーを抽出（頻度の判定は後段で prefs を見て行う）。
  // 以前は「未送信通知を持つ全ユーザー」の先頭 5000 人を userId 順に取っていた。
  // LINE 未連携のユーザーの通知は永久に未送信のまま残るため、そうしたユーザーが
  // 5000 人を超えると、それ以降の ID のユーザーにはダイジェストが届かなくなる。
  // 送り先のある (lineUserId を持つ) ユーザーと直近の通知だけに絞る。
  const users = await prisma.user.findMany({
    where: {
      status: "active",
      lineUserId: { not: null },
      notifications: {
        some: {
          linePushedAt: null,
          createdAt: {
            lte: startedAt,
            gte: new Date(startedAt.getTime() - LOOKBACK_MS),
          },
        },
      },
    },
    orderBy: { id: "asc" },
    take: MAX_USERS,
    select: { id: true, notificationPrefs: true },
  })

  let candidates = 0
  let sent = 0
  let skippedFrequency = 0
  let skippedQuiet = 0

  for (const user of users) {
    candidates++
    const userId = user.id
    try {
      const prefs = parsePrefs(user.notificationPrefs)

      // 即時配信ユーザーの取りこぼし救済 (daily 実行時のみ)
      const isImmediateCatchUp = mode === "daily" && prefs.frequency === "immediate"

      // この実行モード(daily/weekly)に一致し、LINE 有効なユーザーのみ送信
      if (
        (prefs.frequency !== mode && !isImmediateCatchUp) ||
        !prefs.lineEnabled
      ) {
        skippedFrequency++
        continue
      }
      // この cron は毎時実行される。ユーザーごとの配信時刻 (通常 9 時、
      // 静音時間に掛かる場合はその終了時刻) の回だけ送る。
      if (
        jstHourOf(startedAt) !==
        digestHourJst(prefs, { afterQuietHours: isImmediateCatchUp })
      ) {
        skippedQuiet++
        continue
      }

      // 当該ユーザーの未送信通知（cutoff 以前）を取得
      const rows = await prisma.notification.findMany({
        where: {
          userId,
          linePushedAt: null,
          createdAt: {
            lte: startedAt,
            ...(isImmediateCatchUp && {
              gte: new Date(startedAt.getTime() - IMMEDIATE_CATCHUP_MS),
            }),
          },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
        select: { title: true },
      })
      if (rows.length === 0) continue

      const total = rows.length
      const items = rows.slice(0, ITEMS_IN_MESSAGE).map((r) => r.title)
      const label = isImmediateCatchUp
        ? ""
        : mode === "weekly"
          ? "今週の"
          : "今日の"

      // 1 通のダイジェストとして LINE Push（友だち未連携なら内部で無送信）
      const result = await pushUserNotification({
        userId,
        title: `📬 ${label}新着のお知らせ ${total} 件`,
        body:
          total > ITEMS_IN_MESSAGE
            ? `未読の通知が ${total} 件あります（一部を表示）`
            : null,
        items,
        linkUrl: "/mypage/notifications",
        linkLabel: "通知一覧を見る",
        kind: "system",
      })

      // LINE API 呼び出し自体が失敗した場合はマークせず次回実行へ持ち越す
      // (linePushedAt が唯一の再送ガードのため、失敗を成功扱いにすると
      // その通知は二度と送られなくなる)。友だち未連携 (no_recipient) は
      // 恒常的な状態なので、無限リトライを避けるためマークする。
      if (result === "failed") {
        errors.push(`user:${userId}: line push failed`)
        continue
      }

      // 送信済みとしてマーク（cutoff 以前の未送信を一括）
      await prisma.notification.updateMany({
        where: { userId, linePushedAt: null, createdAt: { lte: startedAt } },
        data: { linePushedAt: startedAt },
      })
      if (result === "sent") sent++
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

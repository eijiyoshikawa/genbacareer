import { z } from "zod"

/**
 * スカウトメッセージ機能 (12.x) のドメインヘルパ。
 *
 * - 有効期限: sentAt + 30 日
 * - 件名は固定書式 (企業側でカスタマイズ不可)
 * - 本文は 20〜2,000 文字
 * - 同じ (companyId, jobId, userId) で status が sent/read のレコードがある間は再送不可
 *   (DB 側 partial unique index で保証 + API でも事前チェック)
 */

/** スカウト有効期限 (ms) */
export const SCOUT_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000

/** 本文の最小/最大文字数 (DB CHECK 制約と揃える) */
export const SCOUT_BODY_MIN = 20
export const SCOUT_BODY_MAX = 2_000

/** 件名の最小/最大文字数 (DB CHECK 制約と揃える) */
export const SCOUT_SUBJECT_MIN = 5
export const SCOUT_SUBJECT_MAX = 120

/**
 * 固定件名 (マイナビ参考)。
 * 企業側はカスタマイズ不可。
 */
export function buildScoutSubject(companyName: string): string {
  return `${companyName}からスカウトが届きました！[ゲンバキャリア / スカウト着信通知]`
}

/** sentAt から 30 日後を返す。 */
export function buildScoutExpiry(sentAt: Date): Date {
  return new Date(sentAt.getTime() + SCOUT_EXPIRY_MS)
}

/**
 * スカウトが期限切れかどうかをリアルタイムに判定する。
 *
 * status の "expired" への反映は日次 cron (expire-scouts) 任せのため、
 * expiresAt を過ぎてから cron が走るまで（最大 24h 弱）は status が
 * sent/read のまま残る。cron を待たず expiresAt を直接見て判定することで、
 * その間も期限切れとして正しく扱えるようにする。
 */
export function isScoutExpired(scout: {
  status: string
  expiresAt: Date
}): boolean {
  if (scout.status === "expired" || scout.status === "declined") return false
  return scout.expiresAt.getTime() <= Date.now()
}

/**
 * スカウト送信可否の判定。
 * - 求人が active であること
 * - 求職者が searching または employed_open であること (hired は除く)
 * - 求職者アカウントが active であること
 */
export function canSendScout({
  job,
  user,
}: {
  job: { status: string } | null | undefined
  user: { status: string; jobSearchStatus: string } | null | undefined
}): boolean {
  if (!job || !user) return false
  if (job.status !== "active") return false
  if (user.status !== "active") return false
  if (user.jobSearchStatus !== "searching" && user.jobSearchStatus !== "employed_open") {
    return false
  }
  return true
}

/**
 * スカウト送信入力の Zod schema。
 * 件名はサーバ側で固定生成するため body のみ受理。
 */
export const scoutInputSchema = z.object({
  jobId: z.uuid(),
  userId: z.uuid(),
  body: z
    .string()
    .min(SCOUT_BODY_MIN, `本文は ${SCOUT_BODY_MIN} 文字以上で入力してください`)
    .max(SCOUT_BODY_MAX, `本文は ${SCOUT_BODY_MAX} 文字以内で入力してください`),
})

export type ScoutInput = z.infer<typeof scoutInputSchema>

/**
 * 本文の冒頭抜粋を作る (メールテンプレ用)。
 * 改行を空白に置換し、120 文字 + "..." で切る。
 */
export function buildScoutExcerpt(body: string, maxLen = 120): string {
  const flat = body.replace(/\s+/g, " ").trim()
  if (flat.length <= maxLen) return flat
  return flat.slice(0, maxLen) + "..."
}

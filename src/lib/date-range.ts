/**
 * 日付計算ユーティリティ。
 *
 * Server Component の本体で直接 `new Date(Date.now() - ...)` を呼ぶと
 * react-hooks/purity が「impure function during render」として警告する。
 * 純粋な util 経由で呼べば警告を回避でき、テスト時も差し替えやすい。
 */

export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000)
}

export function startOfUtcDay(d: Date = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/**
 * "YYYY-MM-DD" の日付のみの文字列を、その日の JST 23:59:59.999 に対応する
 * Date インスタンスに変換する。
 *
 * `new Date("2026-06-30")` は UTC 00:00:00（= JST 09:00）と解釈されるため、
 * 「契約終了日はその日いっぱい有効」という意図の入力（admin の `<input type="date">`
 * 等）をそのまま `new Date()` に渡すと、実際には JST 09:00 の時点で
 * 期限切れ扱いになってしまう（本来より最大 15 時間早く失効する）。
 */
export function endOfDayJst(dateOnly: string): Date {
  const utcMidnight = new Date(`${dateOnly}T00:00:00.000Z`)
  return new Date(utcMidnight.getTime() + 15 * 60 * 60 * 1000 - 1)
}

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

/**
 * 日付のみ ("YYYY-MM-DD") ならその日の JST 終わりとして、
 * 時刻付き ISO 文字列ならそのまま Date に変換する。
 * 「有効期限」系の入力（Company.planPaidUntil 等）を保存する際に使う。
 */
export function parseExpiryDateInput(value: string): Date {
  return DATE_ONLY_RE.test(value) ? endOfDayJst(value) : new Date(value)
}

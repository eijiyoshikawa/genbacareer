/**
 * CSV セルのエスケープ（エクスポート共通）。
 *
 * - `" , CR LF` を含む値はダブルクォートで囲む
 * - 先頭が `= + - @ TAB CR` の文字列は Excel / Google スプレッドシートで数式として
 *   評価される (CSV インジェクション)。氏名・応募メッセージなど求職者が自由入力
 *   できる値がそのまま出力されるため、先頭に `'` を付けて文字列として扱わせる。
 *   数字・電話番号だけで構成される値 ("+81 90-1234-5678" や "-5") は関数を
 *   呼び出せず無害なので、取り込み先 (ATS 等) を壊さないようそのまま出力する。
 */
const FORMULA_PREFIX = /^[=+\-@\t\r]/
const NUMERIC_LIKE = /^[+-]?[\d\s().-]+$/

export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  let s = String(value)
  if (typeof value === "string" && FORMULA_PREFIX.test(s) && !NUMERIC_LIKE.test(s)) {
    s = `'${s}`
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

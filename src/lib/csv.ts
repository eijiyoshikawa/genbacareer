/**
 * CSV セル値のエスケープ。
 *
 * 数式インジェクション対策: セルが =, +, -, @ 等で始まると Excel / Google
 * Sheets がそれを数式として評価してしまう (CSV injection)。応募者名や
 * 応募メッセージなど第三者が自由入力した値をそのままエクスポートしている
 * ため、該当する場合は先頭に ' を付与して無害化する。
 */
export function csvEscape(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  let s = String(value)
  if (/^[=+\-@\t\r]/.test(s)) {
    s = `'${s}`
  }
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

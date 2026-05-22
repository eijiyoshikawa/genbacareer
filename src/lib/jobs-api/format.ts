/**
 * HwJob 表示向けフォーマッタ。
 *
 * 注意: HANDOVER §9 により求人内容（title/description 等）の改変は禁止。
 * ここで行うのは「数値→桁区切り」「null→ダッシュ」など機械的変換のみ。
 */

const yenFormatter = new Intl.NumberFormat("ja-JP", { style: "currency", currency: "JPY", maximumFractionDigits: 0 })

export function formatYen(value: number | null | undefined): string | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null
  return yenFormatter.format(value)
}

/**
 * salary.min/max の表示文字列。display があればそれを優先、無ければ数値から組み立てる。
 */
export function formatSalaryRange(salary: {
  display: string | null
  min: number | null
  max: number | null
}): string | null {
  if (salary.display) return salary.display
  const min = formatYen(salary.min)
  const max = formatYen(salary.max)
  if (min && max && min !== max) return `${min} 〜 ${max}`
  return min ?? max ?? null
}

/**
 * ISO 日付 ("YYYY-MM-DD") を「YYYY年M月D日」に整形。null は null を返す。
 */
export function formatJpDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso)
  if (!m) return iso
  const [, y, mo, d] = m
  return `${y}年${Number(mo)}月${Number(d)}日`
}

/**
 * lastSyncedAt 表示用：ISO datetime → "YYYY-MM-DD HH:mm"
 */
export function formatLastSynced(isoDatetime: string | null | undefined): string | null {
  if (!isoDatetime) return null
  const date = new Date(isoDatetime)
  if (Number.isNaN(date.getTime())) return null
  const y = date.getFullYear()
  const mo = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  const h = String(date.getHours()).padStart(2, "0")
  const mi = String(date.getMinutes()).padStart(2, "0")
  return `${y}-${mo}-${d} ${h}:${mi}`
}

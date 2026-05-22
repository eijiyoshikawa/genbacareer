/**
 * Company.schedulingUrls の型定義 + パース。
 *
 * 期待する形:
 *   [{ name: "Google Calendar", url: "https://...", primary?: true }, ...]
 */

export type SchedulingUrl = {
  name: string
  url: string
  primary?: boolean
}

const MAX_URLS = 10

/**
 * URL の安全性検証:
 * - HTTPS のみ許可（http / javascript: / data: / file: は拒否）
 * - new URL() でパース可能であること
 * - hostname が localhost / private IP でないこと
 * - 最大 500 文字
 */
function isSafeSchedulingUrl(value: string): boolean {
  if (value.length === 0 || value.length > 500) return false
  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (parsed.protocol !== "https:") return false
  const host = parsed.hostname.toLowerCase()
  if (host === "localhost" || host === "127.0.0.1" || host === "::1") return false
  if (/^10\./.test(host)) return false
  if (/^172\.(1[6-9]|2[0-9]|3[01])\./.test(host)) return false
  if (/^192\.168\./.test(host)) return false
  return true
}

export function parseSchedulingUrls(raw: unknown): SchedulingUrl[] {
  if (!Array.isArray(raw)) return []
  const items: SchedulingUrl[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const obj = entry as Record<string, unknown>
    const name = typeof obj.name === "string" ? obj.name.trim() : ""
    const url = typeof obj.url === "string" ? obj.url.trim() : ""
    if (!name || !url) continue
    if (!isSafeSchedulingUrl(url)) continue
    items.push({
      name: name.slice(0, 60),
      url: url.slice(0, 500),
      primary: obj.primary === true,
    })
    if (items.length >= MAX_URLS) break
  }
  // 1 つだけ primary、最初に並ぶように整列
  // primary を先頭に、その後は登録順を維持
  const indexed = items.map((it, i) => ({ it, i }))
  indexed.sort((a, b) => {
    if (a.it.primary && !b.it.primary) return -1
    if (!a.it.primary && b.it.primary) return 1
    return a.i - b.i
  })
  return indexed.map((x) => x.it)
}

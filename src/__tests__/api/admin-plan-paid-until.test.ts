import { describe, it, expect } from "vitest"

/**
 * /api/admin/companies/[id]/plan の契約終了日パース。
 *
 * <input type="date"> から届く "YYYY-MM-DD" は、そのまま new Date() に渡すと
 * UTC 深夜 0 時 (= JST 9:00) になってしまい、管理者が「その日まで有効」と
 * 設定したつもりの契約が JST 9:00 に前倒しで期限切れになる。
 * JST 23:59:59 として解釈することで意図通り「その日いっぱい」有効にする。
 */
function parsePlanPaidUntil(value: string | null): Date | null {
  if (!value) return null
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return new Date(`${value}T23:59:59+09:00`)
  }
  return new Date(value)
}

describe("parsePlanPaidUntil", () => {
  it("returns null for null input", () => {
    expect(parsePlanPaidUntil(null)).toBeNull()
  })

  it("interprets a date-only string as end-of-day JST, not UTC midnight", () => {
    const result = parsePlanPaidUntil("2026-09-01")
    expect(result).not.toBeNull()
    // UTC midnight (旧実装のバグ) だと JST 9:00 になるが、正しくは JST 23:59:59。
    expect(result!.toISOString()).toBe("2026-09-01T14:59:59.000Z")

    // 9 月 1 日の日中 (JST) はまだ有効であるべき。
    const duringTheDayJst = new Date("2026-09-01T10:00:00+09:00")
    expect(result!.getTime() > duringTheDayJst.getTime()).toBe(true)

    // 9 月 2 日になったら期限切れであるべき。
    const nextDayJst = new Date("2026-09-02T00:00:01+09:00")
    expect(result!.getTime() < nextDayJst.getTime()).toBe(true)
  })

  it("passes full ISO datetime strings through unchanged", () => {
    const iso = "2026-09-01T05:00:00.000Z"
    expect(parsePlanPaidUntil(iso)!.toISOString()).toBe(iso)
  })
})

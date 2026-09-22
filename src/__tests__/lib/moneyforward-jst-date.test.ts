import { describe, it, expect } from "vitest"

/**
 * MoneyForward 請求書の billing_date/due_date を JST 暦日でフォーマットする
 * ロジックの回帰テスト（src/lib/moneyforward.ts の toJstDateString と同じ実装）。
 *
 * 過去のバグ: `date.toISOString().slice(0, 10)` は UTC の暦日を返すため、
 * UTC 15:00〜23:59 (= JST 00:00〜08:59) に発行された請求書は実際より
 * 1 日前の日付が請求書に印字されていた。
 */
function toJstDateString(date: Date): string {
  return date.toLocaleDateString("sv-SE", { timeZone: "Asia/Tokyo" })
}

describe("MoneyForward invoice date: JST calendar day formatting", () => {
  it("does not roll back to the previous day for a JST-early-morning timestamp", () => {
    // UTC 2026-04-01T20:00:00Z = JST 2026-04-02T05:00:00
    const d = new Date("2026-04-01T20:00:00Z")
    expect(toJstDateString(d)).toBe("2026-04-02")
    // 対照: 旧実装 (UTC slice) はここで "2026-04-01" を返してしまっていた
    expect(d.toISOString().slice(0, 10)).toBe("2026-04-01")
  })

  it("matches the UTC date for a daytime-JST timestamp", () => {
    // UTC 2026-04-01T05:00:00Z = JST 2026-04-01T14:00:00
    const d = new Date("2026-04-01T05:00:00Z")
    expect(toJstDateString(d)).toBe("2026-04-01")
  })
})

import { describe, it, expect } from "vitest"
import { toJstDateString } from "@/lib/moneyforward"

// MoneyForward 請求書の billing_date / due_date は Date#toISOString().slice(0, 10)
// (UTC 暦日) で組み立てられていたため、日本時間 0:00〜8:59 に発行された請求書は
// 前日の日付で記録されてしまっていた。JST 暦日で組み立てられることを確認する。
describe("toJstDateString", () => {
  it("returns the same calendar day for a UTC-daytime timestamp", () => {
    expect(toJstDateString(new Date("2026-09-14T10:00:00.000Z"))).toBe(
      "2026-09-14"
    )
  })

  it("does not roll back to the previous day for early-JST-morning timestamps", () => {
    // 2026-09-14T01:00:00Z == 2026-09-14 10:00 JST — same JST day
    expect(toJstDateString(new Date("2026-09-14T01:00:00.000Z"))).toBe(
      "2026-09-14"
    )
    // 2026-09-13T20:00:00Z == 2026-09-14 05:00 JST — JST day already rolled over
    expect(toJstDateString(new Date("2026-09-13T20:00:00.000Z"))).toBe(
      "2026-09-14"
    )
  })
})

import { describe, it, expect } from "vitest"
import {
  calculateMonthsAfterHire,
  refundRateForMonths,
  calculateRefundAmount,
  isEligibleForRefund,
  computeRefundParams,
  REFUND_RATE_SCHEDULE,
} from "@/lib/early-resignation"

describe("REFUND_RATE_SCHEDULE", () => {
  it("has 3 tiers", () => {
    expect(REFUND_RATE_SCHEDULE.length).toBe(3)
  })

  it("matches business rules (80/50/20)", () => {
    expect(REFUND_RATE_SCHEDULE[0]).toEqual({
      monthsAfterHire: 1,
      refundRate: 80,
    })
    expect(REFUND_RATE_SCHEDULE[1]).toEqual({
      monthsAfterHire: 2,
      refundRate: 50,
    })
    expect(REFUND_RATE_SCHEDULE[2]).toEqual({
      monthsAfterHire: 3,
      refundRate: 20,
    })
  })
})

describe("calculateMonthsAfterHire", () => {
  it("returns 0 for resignation before/equal hire date", () => {
    const d = new Date("2026-05-21")
    expect(calculateMonthsAfterHire(d, d)).toBe(0)
    expect(calculateMonthsAfterHire(d, new Date("2026-05-20"))).toBe(0)
  })

  it("rounds up to minimum 1 month for any positive diff", () => {
    const hire = new Date("2026-01-01T00:00:00Z")
    const day3 = new Date("2026-01-04T00:00:00Z") // 3 日後
    expect(calculateMonthsAfterHire(hire, day3)).toBe(1)
  })

  it("returns 1 for exactly 30 days", () => {
    const hire = new Date("2026-01-01T00:00:00Z")
    const day30 = new Date("2026-01-31T00:00:00Z") // 30 日後
    expect(calculateMonthsAfterHire(hire, day30)).toBe(1)
  })

  it("returns 2 for 45 days (1.5 months)", () => {
    const hire = new Date("2026-01-01T00:00:00Z")
    const day45 = new Date("2026-02-15T00:00:00Z")
    expect(calculateMonthsAfterHire(hire, day45)).toBe(2)
  })

  it("returns 3 for exactly 90 days", () => {
    const hire = new Date("2026-01-01T00:00:00Z")
    const day90 = new Date("2026-04-01T00:00:00Z")
    expect(calculateMonthsAfterHire(hire, day90)).toBe(3)
  })

  it("returns 4 for 91 days (boundary case)", () => {
    const hire = new Date("2026-01-01T00:00:00Z")
    const day91 = new Date("2026-04-02T00:00:00Z")
    expect(calculateMonthsAfterHire(hire, day91)).toBe(4)
  })

  it("uses JST calendar days, not raw ms diff, when hiredAt has a time-of-day component", () => {
    // 入社操作が UTC 15:00 (= JST 翌日 00:00) に行われたケース。
    // JST 表示上は 2026-01-02 入社 → 2026-04-02 退職で「ちょうど 3 ヶ月後」。
    // 生の ms 差分だと 90.375 日になり切り上げで 4 ヶ月目 (0%) に誤判定されてしまう
    // バグの回帰テスト。正しくは JST 暦日で 90 日ちょうど → 3 ヶ月 (20%)。
    const hire = new Date("2026-01-01T15:00:00Z") // JST 2026-01-02 00:00
    const resigned = new Date("2026-04-02T00:00:00Z") // <input type="date"> "2026-04-02"
    expect(calculateMonthsAfterHire(hire, resigned)).toBe(3)
  })

  it("does not shift a same-JST-day-of-week hire time earlier than expected", () => {
    // 入社が JST 早朝 (UTC 前日 20:00 = JST 05:00) のケースでも
    // 暦日ベースで正しく 1 ヶ月と判定されること。
    const hire = new Date("2026-01-01T20:00:00Z") // JST 2026-01-02 05:00
    const resigned = new Date("2026-01-31T00:00:00Z") // JST 暦日で 29 日後
    expect(calculateMonthsAfterHire(hire, resigned)).toBe(1)
  })
})

describe("refundRateForMonths", () => {
  it("returns 80 for 1 month", () => {
    expect(refundRateForMonths(1)).toBe(80)
  })

  it("returns 50 for 2 months", () => {
    expect(refundRateForMonths(2)).toBe(50)
  })

  it("returns 20 for 3 months", () => {
    expect(refundRateForMonths(3)).toBe(20)
  })

  it("returns 0 for 4 months and beyond", () => {
    expect(refundRateForMonths(4)).toBe(0)
    expect(refundRateForMonths(12)).toBe(0)
  })

  it("returns 80 for 0 months (edge)", () => {
    expect(refundRateForMonths(0)).toBe(80)
  })
})

describe("calculateRefundAmount", () => {
  it("computes 80% of 498000 = 398400", () => {
    expect(
      calculateRefundAmount({
        originalFeeAmount: 498_000,
        monthsAfterHire: 1,
      }),
    ).toBe(398_400)
  })

  it("computes 50% of 1000000 = 500000", () => {
    expect(
      calculateRefundAmount({
        originalFeeAmount: 1_000_000,
        monthsAfterHire: 2,
      }),
    ).toBe(500_000)
  })

  it("computes 20% of 498000 = 99600", () => {
    expect(
      calculateRefundAmount({
        originalFeeAmount: 498_000,
        monthsAfterHire: 3,
      }),
    ).toBe(99_600)
  })

  it("returns 0 for 4+ months", () => {
    expect(
      calculateRefundAmount({
        originalFeeAmount: 498_000,
        monthsAfterHire: 4,
      }),
    ).toBe(0)
  })

  it("floors fractional yen (33333 * 0.8 = 26666.4 → 26666)", () => {
    expect(
      calculateRefundAmount({
        originalFeeAmount: 33_333,
        monthsAfterHire: 1,
      }),
    ).toBe(26_666)
  })
})

describe("isEligibleForRefund", () => {
  it("true for 1-3 months", () => {
    expect(isEligibleForRefund(1)).toBe(true)
    expect(isEligibleForRefund(2)).toBe(true)
    expect(isEligibleForRefund(3)).toBe(true)
  })

  it("false for 4+ months", () => {
    expect(isEligibleForRefund(4)).toBe(false)
    expect(isEligibleForRefund(12)).toBe(false)
  })
})

describe("computeRefundParams (integration)", () => {
  it("hired 2026-01-01 → resigned 2026-01-15 → 1 month / 80%", () => {
    const r = computeRefundParams({
      hiredAt: new Date("2026-01-01T00:00:00Z"),
      resignedAt: new Date("2026-01-15T00:00:00Z"),
      originalFeeAmount: 498_000,
    })
    expect(r.monthsAfterHire).toBe(1)
    expect(r.refundRate).toBe(80)
    expect(r.refundAmount).toBe(398_400)
    expect(r.eligible).toBe(true)
  })

  it("hired 2026-01-01 → resigned 2026-03-15 (~73 days, 3 months ceil) / 20%", () => {
    const r = computeRefundParams({
      hiredAt: new Date("2026-01-01T00:00:00Z"),
      resignedAt: new Date("2026-03-15T00:00:00Z"),
      originalFeeAmount: 498_000,
    })
    expect(r.monthsAfterHire).toBe(3)
    expect(r.refundRate).toBe(20)
    expect(r.refundAmount).toBe(99_600)
    expect(r.eligible).toBe(true)
  })

  it("hired 2026-01-01 → resigned 2026-06-01 (5+ months) / 0%", () => {
    const r = computeRefundParams({
      hiredAt: new Date("2026-01-01T00:00:00Z"),
      resignedAt: new Date("2026-06-01T00:00:00Z"),
      originalFeeAmount: 498_000,
    })
    expect(r.eligible).toBe(false)
    expect(r.refundRate).toBe(0)
    expect(r.refundAmount).toBe(0)
  })
})

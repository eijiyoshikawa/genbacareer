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

  it("returns 1 for exactly one calendar month across a 31-day month (regression: day/30 approximation used to over-count)", () => {
    // 2026-01-01 → 2026-02-01 は暦上ちょうど 1 ヶ月だが 31 日ある
    // (旧実装は ceil(31/30)=2 に切り上がってしまい 50% になるバグがあった)
    const hire = new Date("2026-01-01T00:00:00Z")
    const oneMonthLater = new Date("2026-02-01T00:00:00Z")
    expect(calculateMonthsAfterHire(hire, oneMonthLater)).toBe(1)
  })

  it("returns 3 (not 4) for exactly 3 calendar months across a leap-year February (regression)", () => {
    // 2028 年は閏年。2028-01-01 → 2028-04-01 は暦上ちょうど 3 ヶ月だが
    // 91 日ある (31+29+31)。旧実装は ceil(91/30)=4 に切り上がり、本来
    // 20% 受け取れるはずの返金が 0% になってしまうバグがあった。
    const hire = new Date("2028-01-01T00:00:00Z")
    const threeCalendarMonthsLater = new Date("2028-04-01T00:00:00Z")
    expect(calculateMonthsAfterHire(hire, threeCalendarMonthsLater)).toBe(3)
  })

  it("ignores time-of-day when comparing dates (hiredAt has a timestamp, resignedAt is often date-only)", () => {
    const hiredLateInDay = new Date("2026-01-01T23:59:00Z")
    const resignedMidnight = new Date("2026-02-01T00:00:00Z")
    expect(calculateMonthsAfterHire(hiredLateInDay, resignedMidnight)).toBe(1)
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

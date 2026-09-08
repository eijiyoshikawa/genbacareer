import { describe, it, expect } from "vitest"
import { endOfDayJst, parseExpiryDateInput } from "@/lib/date-range"

describe("endOfDayJst", () => {
  it("converts a date-only string to 23:59:59.999 JST of that day", () => {
    // 2026-06-30 23:59:59.999 JST === 2026-06-30 14:59:59.999 UTC
    const d = endOfDayJst("2026-06-30")
    expect(d.toISOString()).toBe("2026-06-30T14:59:59.999Z")
  })

  it("is 15 hours after naive UTC-midnight parsing (the bug this fixes)", () => {
    const naive = new Date("2026-06-30T00:00:00.000Z")
    const fixed = endOfDayJst("2026-06-30")
    expect(fixed.getTime() - naive.getTime()).toBe(15 * 60 * 60 * 1000 - 1)
  })
})

describe("parseExpiryDateInput", () => {
  it("treats a date-only string as end-of-day JST", () => {
    const d = parseExpiryDateInput("2026-06-30")
    expect(d.toISOString()).toBe("2026-06-30T14:59:59.999Z")
  })

  it("passes a full ISO datetime through unchanged", () => {
    const iso = "2026-06-30T03:00:00.000Z"
    expect(parseExpiryDateInput(iso).toISOString()).toBe(iso)
  })

  it("a company still has paid access for the entire last contracted day in JST", () => {
    const paidUntil = parseExpiryDateInput("2026-06-30")
    // 2026-06-30 20:00 JST === 2026-06-30 11:00 UTC — still within the contracted day
    const lateInJstDay = new Date("2026-06-30T11:00:00.000Z")
    expect(paidUntil.getTime() > lateInJstDay.getTime()).toBe(true)
  })
})

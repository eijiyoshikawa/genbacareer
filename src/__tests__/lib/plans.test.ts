import { describe, it, expect } from "vitest"
import {
  PLAN_TYPES,
  PLAN_LABELS,
  isPlanType,
  planTier,
  isPaidPlan,
  isMonthlyPlan,
  isPlanEligibleForBonus,
  canSendScoutByPlan,
  isPlanActive,
  daysUntilPlanExpiry,
  isPlanExpiringSoon,
  canPostJob,
  parsePlanPaidUntilInput,
} from "@/lib/plans"

describe("PLAN_TYPES / PLAN_LABELS", () => {
  it("has 5 plan types", () => {
    expect(PLAN_TYPES.length).toBe(5)
  })

  it("has label for every plan type", () => {
    for (const t of PLAN_TYPES) {
      expect(PLAN_LABELS[t]).toBeTruthy()
    }
  })
})

describe("isPlanType", () => {
  it("recognizes valid plan types", () => {
    expect(isPlanType("success_fee")).toBe(true)
    expect(isPlanType("monthly_12")).toBe(true)
    expect(isPlanType("monthly_24")).toBe(true)
    expect(isPlanType("campaign_free")).toBe(true)
    expect(isPlanType("sns_client")).toBe(true)
  })

  it("rejects invalid", () => {
    expect(isPlanType("monthly_36")).toBe(false)
    expect(isPlanType("")).toBe(false)
    expect(isPlanType("free")).toBe(false)
  })
})

describe("planTier", () => {
  it("returns 3 for paid plans", () => {
    expect(planTier({ planType: "success_fee" })).toBe(3)
    expect(planTier({ planType: "monthly_12" })).toBe(3)
    expect(planTier({ planType: "monthly_24" })).toBe(3)
  })

  it("returns 2 for sns_client", () => {
    expect(planTier({ planType: "sns_client" })).toBe(2)
  })

  it("returns 1 for campaign_free", () => {
    expect(planTier({ planType: "campaign_free" })).toBe(1)
  })

  it("returns 0 for unknown plan type", () => {
    expect(planTier({ planType: "garbage" })).toBe(0)
    expect(planTier({ planType: null })).toBe(0)
  })

  it("returns 0 for HelloWork imports regardless of planType", () => {
    expect(planTier({ planType: "success_fee", source: "hellowork" })).toBe(0)
    expect(planTier({ planType: "monthly_12", source: "hellowork" })).toBe(0)
    expect(planTier({ planType: "sns_client", source: "hellowork" })).toBe(0)
  })
})

describe("isPaidPlan", () => {
  it("returns true only for paid plans", () => {
    expect(isPaidPlan("success_fee")).toBe(true)
    expect(isPaidPlan("monthly_12")).toBe(true)
    expect(isPaidPlan("monthly_24")).toBe(true)
    expect(isPaidPlan("sns_client")).toBe(false)
    expect(isPaidPlan("campaign_free")).toBe(false)
  })
})

describe("isMonthlyPlan", () => {
  it("returns true only for monthly plans", () => {
    expect(isMonthlyPlan("monthly_12")).toBe(true)
    expect(isMonthlyPlan("monthly_24")).toBe(true)
    expect(isMonthlyPlan("success_fee")).toBe(false)
    expect(isMonthlyPlan("sns_client")).toBe(false)
    expect(isMonthlyPlan("campaign_free")).toBe(false)
  })
})

describe("isPlanEligibleForBonus (C5)", () => {
  it("allows monthly_12 / monthly_24 / sns_client", () => {
    expect(isPlanEligibleForBonus("monthly_12")).toBe(true)
    expect(isPlanEligibleForBonus("monthly_24")).toBe(true)
    expect(isPlanEligibleForBonus("sns_client")).toBe(true)
  })

  it("rejects success_fee and campaign_free", () => {
    expect(isPlanEligibleForBonus("success_fee")).toBe(false)
    expect(isPlanEligibleForBonus("campaign_free")).toBe(false)
    expect(isPlanEligibleForBonus(null)).toBe(false)
  })
})

describe("canSendScoutByPlan", () => {
  it("rejects campaign_free", () => {
    expect(canSendScoutByPlan("campaign_free")).toBe(false)
  })

  it("allows other plans", () => {
    expect(canSendScoutByPlan("success_fee")).toBe(true)
    expect(canSendScoutByPlan("monthly_12")).toBe(true)
    expect(canSendScoutByPlan("monthly_24")).toBe(true)
    expect(canSendScoutByPlan("sns_client")).toBe(true)
  })
})

describe("isPlanActive", () => {
  const now = new Date("2026-05-21T00:00:00Z")
  const future = new Date("2026-06-21T00:00:00Z")
  const past = new Date("2026-05-01T00:00:00Z")

  it("success_fee is always active", () => {
    expect(
      isPlanActive({ planType: "success_fee", planPaidUntil: null, now }),
    ).toBe(true)
  })

  it("campaign_free is always active", () => {
    expect(
      isPlanActive({ planType: "campaign_free", planPaidUntil: null, now }),
    ).toBe(true)
  })

  it("monthly_12 needs future paidUntil", () => {
    expect(
      isPlanActive({ planType: "monthly_12", planPaidUntil: future, now }),
    ).toBe(true)
    expect(
      isPlanActive({ planType: "monthly_12", planPaidUntil: past, now }),
    ).toBe(false)
    expect(
      isPlanActive({ planType: "monthly_12", planPaidUntil: null, now }),
    ).toBe(false)
  })

  it("sns_client follows monthly rule", () => {
    expect(
      isPlanActive({ planType: "sns_client", planPaidUntil: future, now }),
    ).toBe(true)
    expect(
      isPlanActive({ planType: "sns_client", planPaidUntil: past, now }),
    ).toBe(false)
  })
})

describe("daysUntilPlanExpiry", () => {
  it("returns null for null", () => {
    expect(daysUntilPlanExpiry(null)).toBe(null)
  })

  it("returns days remaining", () => {
    const now = new Date("2026-05-21T00:00:00Z")
    const future = new Date("2026-05-31T00:00:00Z")
    expect(daysUntilPlanExpiry(future, now)).toBe(10)
  })

  it("returns negative for past", () => {
    const now = new Date("2026-05-21T00:00:00Z")
    const past = new Date("2026-05-11T00:00:00Z")
    expect(daysUntilPlanExpiry(past, now)).toBe(-10)
  })
})

describe("isPlanExpiringSoon", () => {
  const now = new Date("2026-05-21T00:00:00Z")

  it("true within threshold", () => {
    const soon = new Date("2026-06-15T00:00:00Z") // 25 days
    expect(isPlanExpiringSoon(soon, 30, now)).toBe(true)
  })

  it("false outside threshold", () => {
    const far = new Date("2026-07-15T00:00:00Z")
    expect(isPlanExpiringSoon(far, 30, now)).toBe(false)
  })

  it("false for null", () => {
    expect(isPlanExpiringSoon(null, 30, now)).toBe(false)
  })

  it("false for past dates", () => {
    const past = new Date("2026-05-01T00:00:00Z")
    expect(isPlanExpiringSoon(past, 30, now)).toBe(false)
  })
})

describe("canPostJob", () => {
  const now = new Date("2026-05-21T00:00:00Z")

  it("requires approved status", () => {
    expect(
      canPostJob({
        status: "pending",
        planType: "success_fee",
        planPaidUntil: null,
        now,
      }),
    ).toBe(false)
  })

  it("approved + success_fee is OK", () => {
    expect(
      canPostJob({
        status: "approved",
        planType: "success_fee",
        planPaidUntil: null,
        now,
      }),
    ).toBe(true)
  })

  it("expired monthly cannot post", () => {
    expect(
      canPostJob({
        status: "approved",
        planType: "monthly_12",
        planPaidUntil: new Date("2026-05-01"),
        now,
      }),
    ).toBe(false)
  })
})

describe("parsePlanPaidUntilInput", () => {
  it("treats a date-only string as end-of-day JST, not UTC midnight", () => {
    const parsed = parsePlanPaidUntilInput("2026-09-05")
    // JST 23:59:59 on 2026-09-05 = UTC 14:59:59 on 2026-09-05.
    expect(parsed.toISOString()).toBe("2026-09-05T14:59:59.000Z")

    // A plan should still be considered active for the whole intended day
    // in JST, not just until 09:00 JST (= UTC midnight) as a naive
    // `new Date("2026-09-05")` parse would produce.
    const justBeforeMidnightJst = new Date("2026-09-05T14:00:00.000Z") // 23:00 JST
    expect(
      isPlanActive({
        planType: "monthly_12",
        planPaidUntil: parsed,
        now: justBeforeMidnightJst,
      }),
    ).toBe(true)
  })

  it("parses a full ISO datetime string as-is", () => {
    const parsed = parsePlanPaidUntilInput("2026-09-05T03:00:00.000Z")
    expect(parsed.toISOString()).toBe("2026-09-05T03:00:00.000Z")
  })
})

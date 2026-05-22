import { describe, it, expect } from "vitest"
import {
  HIRING_BONUS_AMOUNT,
  isHiringBonusEligible,
  resolveHiringBonusAmount,
} from "@/lib/hiring-bonus"

describe("HIRING_BONUS_AMOUNT", () => {
  it("is ¥50,000 (C5)", () => {
    expect(HIRING_BONUS_AMOUNT).toBe(50_000)
  })
})

describe("isHiringBonusEligible", () => {
  it("requires status = hired", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "applied",
        companyPlanType: "monthly_12",
      }),
    ).toBe(false)
  })

  it("allows monthly_12 + hired", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "hired",
        companyPlanType: "monthly_12",
      }),
    ).toBe(true)
  })

  it("allows monthly_24 + hired", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "hired",
        companyPlanType: "monthly_24",
      }),
    ).toBe(true)
  })

  it("allows sns_client + hired", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "hired",
        companyPlanType: "sns_client",
      }),
    ).toBe(true)
  })

  it("rejects success_fee + hired", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "hired",
        companyPlanType: "success_fee",
      }),
    ).toBe(false)
  })

  it("rejects campaign_free + hired", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "hired",
        companyPlanType: "campaign_free",
      }),
    ).toBe(false)
  })

  it("rejects null planType", () => {
    expect(
      isHiringBonusEligible({
        applicationStatus: "hired",
        companyPlanType: null,
      }),
    ).toBe(false)
  })
})

describe("resolveHiringBonusAmount", () => {
  it("returns existing amount if set", () => {
    expect(resolveHiringBonusAmount({ amount: 30_000 })).toBe(30_000)
  })

  it("falls back to default", () => {
    expect(resolveHiringBonusAmount(null)).toBe(50_000)
    expect(resolveHiringBonusAmount(undefined)).toBe(50_000)
  })
})

import { describe, it, expect } from "vitest"

/**
 * expire-plans cron の対象判定ロジックを単体テスト。
 * 実際の DB 書き込みは E2E で別途。
 *
 * cron の WHERE 条件:
 *   planType ∈ (monthly_12, monthly_24, sns_client) AND
 *   planPaidUntil < now AND
 *   planTier > 0
 */

function shouldExpire(args: {
  planType: string | null
  planPaidUntil: Date | null
  planTier: number
  now: Date
}): boolean {
  const { planType, planPaidUntil, planTier, now } = args
  const targetPlans = ["monthly_12", "monthly_24", "sns_client"]
  if (!planType || !targetPlans.includes(planType)) return false
  if (!planPaidUntil) return false
  if (planPaidUntil.getTime() >= now.getTime()) return false
  if (planTier <= 0) return false
  return true
}

describe("expire-plans cron target filter", () => {
  const now = new Date("2026-06-01T00:00:00Z")
  const yesterday = new Date("2026-05-31T00:00:00Z")
  const tomorrow = new Date("2026-06-02T00:00:00Z")

  it("expires monthly_12 plan past paid_until", () => {
    expect(
      shouldExpire({
        planType: "monthly_12",
        planPaidUntil: yesterday,
        planTier: 3,
        now,
      }),
    ).toBe(true)
  })

  it("expires monthly_24 plan past paid_until", () => {
    expect(
      shouldExpire({
        planType: "monthly_24",
        planPaidUntil: yesterday,
        planTier: 3,
        now,
      }),
    ).toBe(true)
  })

  it("expires sns_client plan past paid_until", () => {
    expect(
      shouldExpire({
        planType: "sns_client",
        planPaidUntil: yesterday,
        planTier: 2,
        now,
      }),
    ).toBe(true)
  })

  it("does NOT expire active monthly_12 plan", () => {
    expect(
      shouldExpire({
        planType: "monthly_12",
        planPaidUntil: tomorrow,
        planTier: 3,
        now,
      }),
    ).toBe(false)
  })

  it("does NOT expire success_fee (no expiry)", () => {
    expect(
      shouldExpire({
        planType: "success_fee",
        planPaidUntil: yesterday,
        planTier: 3,
        now,
      }),
    ).toBe(false)
  })

  it("does NOT expire campaign_free (no expiry)", () => {
    expect(
      shouldExpire({
        planType: "campaign_free",
        planPaidUntil: yesterday,
        planTier: 1,
        now,
      }),
    ).toBe(false)
  })

  it("does NOT re-process already downgraded company (idempotent)", () => {
    expect(
      shouldExpire({
        planType: "monthly_12",
        planPaidUntil: yesterday,
        planTier: 0,
        now,
      }),
    ).toBe(false)
  })

  it("does NOT expire when paid_until is null", () => {
    expect(
      shouldExpire({
        planType: "monthly_12",
        planPaidUntil: null,
        planTier: 3,
        now,
      }),
    ).toBe(false)
  })

  it("does NOT expire when planType is null", () => {
    expect(
      shouldExpire({
        planType: null,
        planPaidUntil: yesterday,
        planTier: 3,
        now,
      }),
    ).toBe(false)
  })
})

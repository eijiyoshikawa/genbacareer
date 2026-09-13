import { describe, it, expect } from "vitest"
import {
  HIRING_FEE_RATE,
  HIRING_FEE_FALLBACK,
  estimateAnnualIncome,
  resolveHiringFee,
  isValidHiringFee,
  HIRING_FEE_MIN,
  HIRING_FEE_MAX,
} from "@/lib/hiring-fee"

describe("estimateAnnualIncome", () => {
  it("annual はそのまま", () => {
    expect(
      estimateAnnualIncome({ salaryMin: 4_000_000, salaryType: "annual" }),
    ).toBe(4_000_000)
  })
  it("monthly は ×12", () => {
    expect(
      estimateAnnualIncome({ salaryMin: 300_000, salaryType: "monthly" }),
    ).toBe(3_600_000)
  })
  it("hourly は 8h×21日×12ヶ月", () => {
    expect(
      estimateAnnualIncome({ salaryMin: 1_500, salaryType: "hourly" }),
    ).toBe(1_500 * 8 * 21 * 12)
  })
  it("salaryType 不明は月給扱い", () => {
    expect(estimateAnnualIncome({ salaryMin: 250_000, salaryType: null })).toBe(
      3_000_000,
    )
  })
  it("下限が無ければ上限を使う", () => {
    expect(
      estimateAnnualIncome({
        salaryMin: null,
        salaryMax: 400_000,
        salaryType: "monthly",
      }),
    ).toBe(4_800_000)
  })
  it("給与情報なしは null", () => {
    expect(estimateAnnualIncome({ salaryMin: null, salaryMax: null })).toBe(null)
    expect(estimateAnnualIncome({ salaryMin: 0, salaryType: "monthly" })).toBe(null)
  })
})

describe("resolveHiringFee (年収35%モデル)", () => {
  it("admin の個別確定額が最優先", () => {
    expect(
      resolveHiringFee({
        hiringFeeAmount: 1_234_000,
        salaryMin: 300_000,
        salaryType: "monthly",
      }),
    ).toBe(1_234_000)
  })
  it("月給30万 → 年収360万 × 35% = 1,260,000", () => {
    expect(
      resolveHiringFee({ salaryMin: 300_000, salaryType: "monthly" }),
    ).toBe(1_260_000)
  })
  it("年俸500万 → 1,750,000", () => {
    expect(
      resolveHiringFee({ salaryMin: 5_000_000, salaryType: "annual" }),
    ).toBe(1_750_000)
  })
  it("千円単位に丸める", () => {
    // 月給 275,500 → 年収 3,306,000 × 0.35 = 1,157,100 → 1,157,000
    expect(
      resolveHiringFee({ salaryMin: 275_500, salaryType: "monthly" }),
    ).toBe(1_157_000)
  })
  it("給与情報なしはフォールバック額", () => {
    expect(resolveHiringFee({})).toBe(HIRING_FEE_FALLBACK)
    expect(resolveHiringFee(null)).toBe(HIRING_FEE_FALLBACK)
  })
  it("率は 35%", () => {
    expect(HIRING_FEE_RATE).toBe(0.35)
  })
  it("入力ミスで理論年収が極端に大きくなっても上限でクランプされる", () => {
    // 時給欄に月給額を誤入力した想定 (300,000円/時 → 年収6億円超)
    expect(
      resolveHiringFee({ salaryMin: 300_000, salaryType: "hourly" }),
    ).toBe(HIRING_FEE_MAX)
  })
  it("入力ミスで理論年収が極端に小さくなっても下限でクランプされる", () => {
    expect(
      resolveHiringFee({ salaryMin: 1, salaryType: "monthly" }),
    ).toBe(HIRING_FEE_MIN)
  })
  it("admin の個別確定額はクランプの影響を受けない（既に書き込み時に検証済み）", () => {
    expect(
      resolveHiringFee({ hiringFeeAmount: 1_234_000, salaryMin: 1, salaryType: "monthly" }),
    ).toBe(1_234_000)
  })
})

describe("isValidHiringFee", () => {
  it("レンジ内の整数のみ許可", () => {
    expect(isValidHiringFee(HIRING_FEE_MIN)).toBe(true)
    expect(isValidHiringFee(HIRING_FEE_MAX)).toBe(true)
    expect(isValidHiringFee(1_400_000)).toBe(true)
    expect(isValidHiringFee(HIRING_FEE_MIN - 1)).toBe(false)
    expect(isValidHiringFee(HIRING_FEE_MAX + 1)).toBe(false)
    expect(isValidHiringFee(1_400_000.5)).toBe(false)
  })
})

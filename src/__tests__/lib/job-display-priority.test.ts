import { describe, it, expect } from "vitest"
import {
  computeDisplayPriority,
  type JobForPriority,
} from "@/lib/job-display-priority"

const completeMonthly: JobForPriority = {
  source: "hellowork",
  salaryType: "monthly",
  salaryMin: 250_000,
  salaryMax: 350_000,
  employmentType: "full_time",
  workHours: "9:00 - 18:00",
  workHoursNotes: null,
  holidays: "土日祝",
  annualHolidays: 120,
  insurance: "雇用・労災・健康・厚生",
  smokingPolicy: "屋内禁煙",
  trialPeriod: "3ヶ月",
  description: "施工管理業務",
  prefecture: "東京都",
}

describe("computeDisplayPriority", () => {
  it("Tier 1: source='direct' を最優先（他がどうであれ）", () => {
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        source: "direct",
        salaryType: null, // 不完全でも direct なら 1
        salaryMin: null,
      })
    ).toBe(1)
  })

  it("Tier 2: monthly + 9項目すべて埋まる", () => {
    expect(computeDisplayPriority(completeMonthly)).toBe(2)
  })

  it("Tier 3: monthly だが項目欠損", () => {
    expect(
      computeDisplayPriority({ ...completeMonthly, trialPeriod: null })
    ).toBe(3)
    expect(
      computeDisplayPriority({ ...completeMonthly, smokingPolicy: null })
    ).toBe(3)
    expect(
      computeDisplayPriority({ ...completeMonthly, workHours: null, workHoursNotes: null })
    ).toBe(3)
  })

  it("Tier 4: hourly", () => {
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        salaryType: "hourly",
        salaryMin: 1_200,
        salaryMax: 1_500,
      })
    ).toBe(4)
  })

  it("Tier 4: daily", () => {
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        salaryType: "daily",
        salaryMin: 12_000,
      })
    ).toBe(4)
  })

  it("Tier 5: annual", () => {
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        salaryType: "annual",
        salaryMin: 5_000_000,
      })
    ).toBe(5)
  })

  it("Tier 5: salaryType=null", () => {
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        salaryType: null,
      })
    ).toBe(5)
  })

  it("Tier 2 が成立する各項目のバリエーション", () => {
    // workHours が null でも workHoursNotes があれば OK
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        workHours: null,
        workHoursNotes: "土日のみ",
      })
    ).toBe(2)

    // holidays が null でも annualHolidays があれば OK
    expect(
      computeDisplayPriority({
        ...completeMonthly,
        holidays: null,
        annualHolidays: 110,
      })
    ).toBe(2)

    // salaryMax が null でも salaryMin があれば OK
    expect(
      computeDisplayPriority({ ...completeMonthly, salaryMax: null })
    ).toBe(2)
  })

  it("空白文字列は欠損扱い", () => {
    expect(
      computeDisplayPriority({ ...completeMonthly, insurance: "  " })
    ).toBe(3)
  })
})

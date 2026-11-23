import { describe, it, expect } from "vitest"
import {
  findMissingLenient,
  findMissingStrict,
  isBlank,
  type DisclosureJob,
} from "@/lib/job-disclosure"

/** 全項目が明示済みの完全な求人 */
function completeJob(): DisclosureJob {
  return {
    employmentType: "正社員",
    salaryMin: 250000,
    salaryMax: 350000,
    salaryType: "monthly",
    baseSalary: "月給25万〜35万円",
    description: "鉄筋工事の施工",
    workHours: "08:00〜17:00",
    workHoursNotes: null,
    jobConditionNotes: null,
    holidays: "日曜",
    holidaysOther: null,
    annualHolidays: 105,
    insurance: "雇用・労災・健康・厚生",
    smokingPolicy: "屋内禁煙",
    trialPeriod: "あり（3ヶ月）",
    prefecture: "東京都",
  }
}

describe("isBlank", () => {
  it("treats null/undefined/whitespace as blank", () => {
    expect(isBlank(null)).toBe(true)
    expect(isBlank(undefined)).toBe(true)
    expect(isBlank("")).toBe(true)
    expect(isBlank("   ")).toBe(true)
  })
  it("treats real text as not blank", () => {
    expect(isBlank("a")).toBe(false)
    expect(isBlank(" 正社員 ")).toBe(false)
  })
})

describe("findMissingStrict / findMissingLenient", () => {
  it("returns no missing for a complete job", () => {
    const job = completeJob()
    expect(findMissingStrict(job)).toEqual([])
    expect(findMissingLenient(job)).toEqual([])
  })

  it("salary: strict needs structured columns, lenient accepts baseSalary text", () => {
    const job: DisclosureJob = {
      ...completeJob(),
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      baseSalary: "日給12,000円〜",
    }
    expect(findMissingStrict(job)).toContain("salary")
    expect(findMissingLenient(job)).not.toContain("salary")
  })

  it("salary: missing in both when no structured value and no baseSalary", () => {
    const job: DisclosureJob = {
      ...completeJob(),
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      baseSalary: null,
    }
    expect(findMissingStrict(job)).toContain("salary")
    expect(findMissingLenient(job)).toContain("salary")
  })

  it("workHours: lenient falls back to jobConditionNotes", () => {
    const job: DisclosureJob = {
      ...completeJob(),
      workHours: null,
      workHoursNotes: null,
      jobConditionNotes: "就業時間は現場による",
    }
    expect(findMissingStrict(job)).toContain("workHours")
    expect(findMissingLenient(job)).not.toContain("workHours")
  })

  it("holidays: lenient falls back to holidaysOther", () => {
    const job: DisclosureJob = {
      ...completeJob(),
      holidays: null,
      annualHolidays: null,
      holidaysOther: "シフト制",
    }
    expect(findMissingStrict(job)).toContain("holidays")
    expect(findMissingLenient(job)).not.toContain("holidays")
  })

  it("counts 5+ missing fields for a sparse job (cleanup target shape)", () => {
    const job: DisclosureJob = {
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      baseSalary: null,
      description: "現場作業",
      workHours: null,
      workHoursNotes: null,
      jobConditionNotes: null,
      holidays: null,
      holidaysOther: null,
      annualHolidays: null,
      insurance: null,
      smokingPolicy: null,
      trialPeriod: null,
      prefecture: "大阪府",
    }
    const lenient = findMissingLenient(job)
    // employmentType, salary, workHours, holidays, insurance, smokingPolicy, trialPeriod = 7
    expect(lenient.length).toBeGreaterThanOrEqual(5)
    expect(lenient).not.toContain("description")
    expect(lenient).not.toContain("prefecture")
  })
})

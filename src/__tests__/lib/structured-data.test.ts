import { describe, it, expect } from "vitest"
import { generateJobPostingSchema } from "@/lib/structured-data"

describe("generateJobPostingSchema", () => {
  it("generates valid JSON-LD schema with all required fields", () => {
    const schema = generateJobPostingSchema({
      id: "test-id",
      title: "施工管理",
      description: "建設現場の施工管理業務を行う正社員ポジションです。",
      category: "management",
      employmentType: "full_time",
      salaryMin: 300000,
      salaryMax: 500000,
      salaryType: "monthly",
      prefecture: "東京都",
      city: "渋谷区",
      address: "渋谷1-1-1",
      publishedAt: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
      company: {
        name: "テスト建設株式会社",
        logoUrl: null,
        websiteUrl: "https://example.com",
      },
    })

    expect(schema["@context"]).toBe("https://schema.org")
    expect(schema["@type"]).toBe("JobPosting")
    expect(schema.title).toBe("施工管理")
    expect(schema.description).toBe("建設現場の施工管理業務を行う正社員ポジションです。")
    expect(schema.employmentType).toBe("FULL_TIME")
    expect(schema.directApply).toBe(true)
    expect(schema.industry).toBe("施工管理・建設マネジメント")

    const hiringOrg = schema.hiringOrganization as { name: string; sameAs: string[] }
    expect(hiringOrg.name).toBe("テスト建設株式会社")
    expect(hiringOrg.sameAs).toEqual(["https://example.com"])

    const identifier = schema.identifier as { value: string; name: string }
    expect(identifier.value).toBe("test-id")
    expect(identifier.name).toBe("ゲンバキャリア")

    const applicant = schema.applicantLocationRequirements as { name: string }
    expect(applicant.name).toBe("JP")
  })

  it("falls back to richer description when description is null", () => {
    const schema = generateJobPostingSchema({
      id: "test-id",
      title: "求人タイトル",
      description: null,
      category: "construction",
      employmentType: null,
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      prefecture: "大阪府",
      city: "大阪市",
      address: null,
      publishedAt: null,
      createdAt: new Date("2026-01-01"),
      company: null,
    })

    expect(schema.title).toBe("求人タイトル")
    // フォールバックは title + 勤務地 + 業種 を含む
    expect(schema.description).toContain("求人タイトル")
    expect(schema.description).toContain("大阪府")
    expect(schema.description).toContain("建築工事業")
  })

  it("uses expiresAt as validThrough when available", () => {
    const expiresAt = new Date("2026-06-01T00:00:00.000Z")
    const schema = generateJobPostingSchema({
      id: "test-id",
      title: "求人",
      description: "建設現場の施工管理業務を行う正社員ポジションです。",
      category: "construction",
      employmentType: "full_time",
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      prefecture: "東京都",
      city: null,
      address: null,
      publishedAt: new Date("2026-01-01"),
      createdAt: new Date("2026-01-01"),
      expiresAt,
      company: null,
    })
    expect(schema.validThrough).toBe(expiresAt.toISOString())
  })

  it("falls back to datePosted + 90 days when no expiry given", () => {
    const datePosted = new Date("2026-01-01T00:00:00.000Z")
    const schema = generateJobPostingSchema({
      id: "test-id",
      title: "求人",
      description: "建設現場の施工管理業務を行う正社員ポジションです。",
      category: "construction",
      employmentType: "full_time",
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      prefecture: "東京都",
      city: null,
      address: null,
      publishedAt: datePosted,
      createdAt: datePosted,
      company: null,
    })
    const ninetyDaysLater = new Date(
      datePosted.getTime() + 90 * 24 * 60 * 60 * 1000
    )
    expect(schema.validThrough).toBe(ninetyDaysLater.toISOString())
  })

  it("maps salary unit text correctly", () => {
    const schema = generateJobPostingSchema({
      id: "test-id",
      title: "アルバイト",
      description: "建設現場での補助業務。経験不問でしっかり指導します。",
      category: "construction",
      employmentType: "part_time",
      salaryMin: 1500,
      salaryMax: 2000,
      salaryType: "hourly",
      prefecture: "東京都",
      city: null,
      address: null,
      publishedAt: null,
      createdAt: new Date("2026-01-01"),
      company: null,
    })
    const salary = schema.baseSalary as {
      value: { unitText: string; minValue: number; maxValue: number }
    }
    expect(salary.value.unitText).toBe("HOUR")
    expect(salary.value.minValue).toBe(1500)
    expect(salary.value.maxValue).toBe(2000)
  })

  it("uses tags as keywords and benefits as jobBenefits", () => {
    const schema = generateJobPostingSchema({
      id: "test-id",
      title: "鳶職",
      description: "高所作業を中心に、土木現場全般の業務を担当いただきます。",
      category: "construction",
      employmentType: "full_time",
      salaryMin: 280000,
      salaryMax: null,
      salaryType: "monthly",
      prefecture: "東京都",
      city: null,
      address: null,
      publishedAt: null,
      createdAt: new Date("2026-01-01"),
      tags: ["未経験OK", "資格取得支援"],
      benefits: ["社会保険完備", "資格手当", "通勤手当"],
      company: null,
    })
    expect(schema.keywords).toBe("未経験OK, 資格取得支援")
    expect(schema.jobBenefits).toEqual([
      "社会保険完備",
      "資格手当",
      "通勤手当",
    ])
  })

  it("maps various employment types correctly", () => {
    const cases = [
      ["full_time", "FULL_TIME"],
      ["part_time", "PART_TIME"],
      ["contract", "CONTRACTOR"],
      ["temporary", "TEMPORARY"],
      ["intern", "INTERN"],
      ["unknown_value", "OTHER"],
    ] as const

    for (const [input, expected] of cases) {
      const schema = generateJobPostingSchema({
        id: "x",
        title: "x",
        description: "建設現場の施工管理業務を行う正社員ポジションです。",
        category: "construction",
        employmentType: input,
        salaryMin: null,
        salaryMax: null,
        salaryType: null,
        prefecture: "東京都",
        city: null,
        address: null,
        publishedAt: null,
        createdAt: new Date("2026-01-01"),
        company: null,
      })
      expect(schema.employmentType).toBe(expected)
    }
  })

  it("uses helloworkId as identifier when available", () => {
    const schema = generateJobPostingSchema({
      id: "internal-id",
      title: "施工管理",
      description: "建設現場の施工管理業務を行う正社員ポジションです。",
      category: "management",
      employmentType: "full_time",
      salaryMin: null,
      salaryMax: null,
      salaryType: null,
      prefecture: "東京都",
      city: null,
      address: null,
      publishedAt: null,
      createdAt: new Date("2026-01-01"),
      helloworkId: "HW-12345",
      company: null,
    })
    const identifier = schema.identifier as { value: string }
    expect(identifier.value).toBe("HW-12345")
  })
})

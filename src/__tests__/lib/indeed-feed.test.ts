import { describe, it, expect } from "vitest"
import {
  renderIndeedFeed,
  renderIndeedJobEntry,
  formatSalaryForIndeed,
  formatRfc822,
  mapEmploymentTypeToIndeed,
  type IndeedFeedJob,
} from "@/lib/indeed-feed"

const BASE_URL = "https://genbacareer.jp"

function sampleJob(overrides: Partial<IndeedFeedJob> = {}): IndeedFeedJob {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    title: "施工管理スタッフ",
    description: "<p>建築現場の施工管理</p>",
    prefecture: "東京都",
    city: "新宿区",
    salaryMin: 300_000,
    salaryMax: 500_000,
    salaryType: "monthly",
    employmentType: "full_time",
    category: "management",
    publishedAt: new Date("2026-05-21T00:00:00Z"),
    company: { name: "株式会社サンプル" },
    ...overrides,
  }
}

describe("mapEmploymentTypeToIndeed", () => {
  it("maps full_time → fulltime", () => {
    expect(mapEmploymentTypeToIndeed("full_time")).toBe("fulltime")
  })
  it("maps part_time → parttime", () => {
    expect(mapEmploymentTypeToIndeed("part_time")).toBe("parttime")
  })
  it("maps contract → contract", () => {
    expect(mapEmploymentTypeToIndeed("contract")).toBe("contract")
  })
  it("returns empty for unknown / null", () => {
    expect(mapEmploymentTypeToIndeed(null)).toBe("")
    expect(mapEmploymentTypeToIndeed("garbage")).toBe("")
  })
})

describe("formatSalaryForIndeed", () => {
  it("formats min-max monthly", () => {
    expect(
      formatSalaryForIndeed({ min: 300000, max: 500000, type: "monthly" }),
    ).toBe("¥300,000 〜 ¥500,000 / 月")
  })

  it("formats min only", () => {
    expect(
      formatSalaryForIndeed({ min: 300000, max: null, type: "monthly" }),
    ).toBe("¥300,000 以上 / 月")
  })

  it("formats max only", () => {
    expect(
      formatSalaryForIndeed({ min: null, max: 500000, type: "monthly" }),
    ).toBe("¥500,000 以下 / 月")
  })

  it("handles yearly", () => {
    expect(
      formatSalaryForIndeed({ min: 4000000, max: 6000000, type: "yearly" }),
    ).toBe("¥4,000,000 〜 ¥6,000,000 / 年")
  })

  it("handles hourly", () => {
    expect(
      formatSalaryForIndeed({ min: 1200, max: 1500, type: "hourly" }),
    ).toBe("¥1,200 〜 ¥1,500 / 時")
  })

  it("returns empty for null both", () => {
    expect(formatSalaryForIndeed({ min: null, max: null, type: null })).toBe("")
  })

  it("treats min===max as single value (uses range form fallback)", () => {
    expect(
      formatSalaryForIndeed({ min: 300000, max: 300000, type: "monthly" }),
    ).toBe("¥300,000 以上 / 月")
  })

  it("defaults unknown type to monthly", () => {
    expect(
      formatSalaryForIndeed({ min: 300000, max: 500000, type: null }),
    ).toBe("¥300,000 〜 ¥500,000 / 月")
  })
})

describe("formatRfc822", () => {
  it("formats date as RFC 822 (UTC)", () => {
    const d = new Date("2026-05-21T12:34:56Z")
    expect(formatRfc822(d)).toMatch(/^Thu, 21 May 2026 12:34:56 GMT$/)
  })
})

describe("renderIndeedJobEntry", () => {
  it("includes all required fields wrapped in CDATA", () => {
    const xml = renderIndeedJobEntry({
      job: sampleJob(),
      baseUrl: BASE_URL,
    })
    expect(xml).toContain("<title><![CDATA[施工管理スタッフ]]></title>")
    expect(xml).toContain("<company><![CDATA[株式会社サンプル]]></company>")
    expect(xml).toContain("<city><![CDATA[新宿区]]></city>")
    expect(xml).toContain("<state><![CDATA[東京都]]></state>")
    expect(xml).toContain("<country><![CDATA[JP]]></country>")
    expect(xml).toContain("<jobtype><![CDATA[fulltime]]></jobtype>")
    expect(xml).toContain("<category><![CDATA[management]]></category>")
    expect(xml).toContain(
      `<url><![CDATA[${BASE_URL}/jobs/550e8400-e29b-41d4-a716-446655440000]]></url>`,
    )
    expect(xml).toContain(
      "<referencenumber><![CDATA[550e8400-e29b-41d4-a716-446655440000]]></referencenumber>",
    )
    expect(xml).toContain(
      "<salary><![CDATA[¥300,000 〜 ¥500,000 / 月]]></salary>",
    )
  })

  it("escapes ]]> in description (CDATA injection safety)", () => {
    const xml = renderIndeedJobEntry({
      job: sampleJob({
        description: "悪意ある終端]]>とその後ろ",
      }),
      baseUrl: BASE_URL,
    })
    // ]]> がそのまま現れず、エスケープされていること
    expect(xml).not.toContain("悪意ある終端]]>とその後ろ")
    expect(xml).toContain("]]]]><![CDATA[>")
  })

  it("handles null company", () => {
    const xml = renderIndeedJobEntry({
      job: sampleJob({ company: null }),
      baseUrl: BASE_URL,
    })
    expect(xml).toContain("<company><![CDATA[]]></company>")
  })

  it("handles null fields safely", () => {
    const xml = renderIndeedJobEntry({
      job: sampleJob({
        description: null,
        city: null,
        prefecture: null,
        salaryMin: null,
        salaryMax: null,
        employmentType: null,
      }),
      baseUrl: BASE_URL,
    })
    expect(xml).toContain("<description><![CDATA[]]></description>")
    expect(xml).toContain("<city><![CDATA[]]></city>")
    expect(xml).toContain("<state><![CDATA[]]></state>")
    expect(xml).toContain("<jobtype><![CDATA[]]></jobtype>")
    expect(xml).toContain("<salary><![CDATA[]]></salary>")
  })
})

describe("renderIndeedJobEntry with urlBuilder", () => {
  it("uses custom urlBuilder when provided (UTM tracking)", () => {
    const xml = renderIndeedJobEntry({
      job: sampleJob(),
      baseUrl: BASE_URL,
      urlBuilder: (id) => `https://genbacareer.jp/jobs/${id}?utm_source=test`,
    })
    expect(xml).toContain(
      "https://genbacareer.jp/jobs/550e8400-e29b-41d4-a716-446655440000?utm_source=test",
    )
  })

  it("falls back to default URL when urlBuilder is not provided", () => {
    const xml = renderIndeedJobEntry({
      job: sampleJob(),
      baseUrl: BASE_URL,
    })
    expect(xml).toContain(
      `${BASE_URL}/jobs/550e8400-e29b-41d4-a716-446655440000`,
    )
    expect(xml).not.toContain("utm_source")
  })
})

describe("renderIndeedFeed", () => {
  it("contains XML declaration and root <source>", () => {
    const xml = renderIndeedFeed({
      jobs: [sampleJob()],
      baseUrl: BASE_URL,
    })
    expect(xml.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true)
    expect(xml).toContain("<source>")
    expect(xml).toContain("</source>")
  })

  it("includes publisher metadata", () => {
    const xml = renderIndeedFeed({
      jobs: [],
      baseUrl: BASE_URL,
    })
    expect(xml).toContain("<publisher><![CDATA[ゲンバキャリア]]></publisher>")
    expect(xml).toContain(`<publisherurl><![CDATA[${BASE_URL}]]></publisherurl>`)
    expect(xml).toContain("<lastBuildDate>")
  })

  it("includes multiple jobs", () => {
    const xml = renderIndeedFeed({
      jobs: [
        sampleJob({ id: "11111111-1111-1111-1111-111111111111", title: "Job A" }),
        sampleJob({ id: "22222222-2222-2222-2222-222222222222", title: "Job B" }),
      ],
      baseUrl: BASE_URL,
    })
    expect(xml).toContain("Job A")
    expect(xml).toContain("Job B")
    // 2 entries
    expect((xml.match(/<job>/g) ?? []).length).toBe(2)
  })

  it("handles empty jobs array", () => {
    const xml = renderIndeedFeed({
      jobs: [],
      baseUrl: BASE_URL,
    })
    expect(xml).toContain("<source>")
    expect((xml.match(/<job>/g) ?? []).length).toBe(0)
  })

  it("uses custom publisher name", () => {
    const xml = renderIndeedFeed({
      jobs: [],
      baseUrl: BASE_URL,
      publisherName: "別名",
    })
    expect(xml).toContain("<publisher><![CDATA[別名]]></publisher>")
  })
})

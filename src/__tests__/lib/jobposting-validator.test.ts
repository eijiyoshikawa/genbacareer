import { describe, it, expect } from "vitest"
import { validateJobPostingJsonLd } from "@/lib/jobposting-validator"

const validJobPosting = {
  "@context": "https://schema.org",
  "@type": "JobPosting",
  title: "建築施工管理 / 東京",
  description: "東京都内の現場で施工管理をお任せします。",
  datePosted: "2026-05-21",
  validThrough: "2027-05-21T23:59:59+09:00",
  employmentType: "FULL_TIME",
  directApply: true,
  identifier: {
    "@type": "PropertyValue",
    name: "ゲンバキャリア",
    value: "abc-123",
  },
  hiringOrganization: {
    "@type": "Organization",
    name: "株式会社サンプル",
  },
  jobLocation: {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "JP",
      addressRegion: "東京都",
    },
  },
  baseSalary: {
    "@type": "MonetaryAmount",
    currency: "JPY",
    value: {
      "@type": "QuantitativeValue",
      minValue: 300000,
      maxValue: 500000,
      unitText: "MONTH",
    },
  },
}

describe("validateJobPostingJsonLd", () => {
  it("valid な JobPosting は errors 0 + warnings 0", () => {
    const r = validateJobPostingJsonLd(validJobPosting)
    expect(r.valid).toBe(true)
    expect(r.errors).toEqual([])
    expect(r.warnings).toEqual([])
  })

  it("title が欠けると error", () => {
    const { title, ...rest } = validJobPosting
    void title
    const r = validateJobPostingJsonLd(rest)
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("title"))).toBe(true)
  })

  it("hiringOrganization.name が欠けると error", () => {
    const r = validateJobPostingJsonLd({
      ...validJobPosting,
      hiringOrganization: { "@type": "Organization" },
    })
    expect(r.valid).toBe(false)
    expect(r.errors.some((e) => e.includes("hiringOrganization.name"))).toBe(true)
  })

  it("jobLocation も applicantLocationRequirements もないと error", () => {
    const { jobLocation, ...rest } = validJobPosting
    void jobLocation
    const r = validateJobPostingJsonLd(rest)
    expect(r.valid).toBe(false)
    expect(
      r.errors.some((e) => e.includes("jobLocation")),
    ).toBe(true)
  })

  it("applicantLocationRequirements のみでも valid", () => {
    const { jobLocation, ...rest } = validJobPosting
    void jobLocation
    const r = validateJobPostingJsonLd({
      ...rest,
      applicantLocationRequirements: {
        "@type": "Country",
        name: "JP",
      },
    })
    expect(r.valid).toBe(true)
  })

  it("baseSalary も estimatedSalary もないと warning", () => {
    const { baseSalary, ...rest } = validJobPosting
    void baseSalary
    const r = validateJobPostingJsonLd(rest)
    expect(r.valid).toBe(true)
    expect(r.warnings.some((w) => w.includes("baseSalary"))).toBe(true)
  })

  it("validThrough が過去日付だと warning", () => {
    const r = validateJobPostingJsonLd({
      ...validJobPosting,
      validThrough: "2020-01-01T00:00:00Z",
    })
    expect(r.warnings.some((w) => w.includes("過去日付"))).toBe(true)
  })

  it("@context が間違っていると error", () => {
    const r = validateJobPostingJsonLd({
      ...validJobPosting,
      "@context": "http://schema.org",
    })
    expect(r.valid).toBe(false)
  })

  it("@type が JobPosting でないと error", () => {
    const r = validateJobPostingJsonLd({
      ...validJobPosting,
      "@type": "Article",
    })
    expect(r.valid).toBe(false)
  })

  it("datePosted が ISO 形式でないと error", () => {
    const r = validateJobPostingJsonLd({
      ...validJobPosting,
      datePosted: "2026/05/21",
    })
    expect(r.valid).toBe(false)
  })

  it("null / 配列 / プリミティブは error", () => {
    expect(validateJobPostingJsonLd(null).valid).toBe(false)
    expect(validateJobPostingJsonLd([]).valid).toBe(false)
    expect(validateJobPostingJsonLd("string").valid).toBe(false)
  })

  it("推奨フィールド欠如は warning として報告", () => {
    const { directApply, identifier, ...rest } = validJobPosting
    void directApply
    void identifier
    const r = validateJobPostingJsonLd(rest)
    expect(r.valid).toBe(true)
    expect(r.warnings.some((w) => w.includes("directApply"))).toBe(true)
    expect(r.warnings.some((w) => w.includes("identifier"))).toBe(true)
  })
})

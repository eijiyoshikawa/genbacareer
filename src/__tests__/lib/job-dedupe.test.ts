import { describe, it, expect } from "vitest"
import { computeDedupeKey } from "@/lib/job-dedupe"

describe("computeDedupeKey", () => {
  it("returns the same key for identical postings", () => {
    const input = {
      title: "鳶工（足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "渋谷区",
      employmentType: "full_time",
    }
    expect(computeDedupeKey(input)).toBe(computeDedupeKey({ ...input }))
  })

  it("normalizes title/prefecture/city whitespace and casing", () => {
    const a = computeDedupeKey({
      title: "鳶工 （足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "渋谷区",
      employmentType: "full_time",
    })
    const b = computeDedupeKey({
      title: "鳶工（足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "渋谷区",
      employmentType: "full_time",
    })
    expect(a).toBe(b)
  })

  it("treats different cities of the same company/prefecture as distinct postings", () => {
    const shibuya = computeDedupeKey({
      title: "鳶工（足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "渋谷区",
      employmentType: "full_time",
    })
    const adachi = computeDedupeKey({
      title: "鳶工（足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "足立区",
      employmentType: "full_time",
    })
    expect(shibuya).not.toBe(adachi)
  })

  it("treats different employment types as distinct postings", () => {
    const fullTime = computeDedupeKey({
      title: "鳶工（足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "渋谷区",
      employmentType: "full_time",
    })
    const dayRate = computeDedupeKey({
      title: "鳶工（足場組立）",
      companyId: "company-1",
      prefecture: "東京都",
      city: "渋谷区",
      employmentType: "contract",
    })
    expect(fullTime).not.toBe(dayRate)
  })
})

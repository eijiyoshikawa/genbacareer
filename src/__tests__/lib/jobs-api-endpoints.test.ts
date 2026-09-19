import { describe, it, expect } from "vitest"
import { jobToHwJob, type HwJobRow } from "@/lib/jobs-api/endpoints"

/**
 * jobToHwJob は HelloWork 求人詳細/一覧 API (公開エンドポイント) の JSON-LD
 * datePosted のソース。receivedDate 列を読まず常に null を返していたため、
 * schema.org JobPosting の必須項目 datePosted が全 HelloWork 求人ページで
 * 欠落し続けていた (定期バグ検査で確認 — Search Console インデックスエラー)。
 */
function job(overrides: Partial<HwJobRow>): HwJobRow {
  return {
    helloworkId: "12345-6789",
    title: "とび職",
    description: "高所作業を含む建設現場業務",
    employmentType: "full_time",
    prefecture: "東京都",
    address: null,
    salaryMin: 250000,
    salaryMax: 300000,
    salaryType: "monthly",
    expiresAt: null,
    receivedDate: null,
    ...overrides,
  }
}

describe("jobToHwJob", () => {
  it("populates dates.receivedAt from the job's receivedDate column", () => {
    const result = jobToHwJob(
      job({ receivedDate: new Date("2026-07-01T00:00:00Z") })
    )
    expect(result.dates.receivedAt).toBe("2026-07-01T00:00:00.000Z")
  })

  it("falls back to null when receivedDate is not set", () => {
    const result = jobToHwJob(job({ receivedDate: null }))
    expect(result.dates.receivedAt).toBeNull()
  })
})

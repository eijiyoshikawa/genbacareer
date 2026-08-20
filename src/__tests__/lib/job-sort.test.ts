import { describe, it, expect } from "vitest"
import { buildPublicJobOrderBy, type PublicJobSort } from "@/lib/job-sort"

const SORTS: PublicJobSort[] = [
  "recommended",
  "newest",
  "salary_high",
  "salary_low",
  "popular",
]

// nullable な列を素の "desc" で並べると Postgres は NULLS FIRST を採るため、
// 「給与が高い順」の先頭が給与非公開の求人になってしまう。
function collectNullableDesc(orderBy: unknown[]): string[] {
  const bad: string[] = []
  for (const clause of orderBy) {
    for (const [field, value] of Object.entries(
      clause as Record<string, unknown>
    )) {
      if (
        (field === "salaryMin" || field === "publishedAt") &&
        typeof value === "string"
      ) {
        bad.push(field)
      }
    }
  }
  return bad
}

describe("buildPublicJobOrderBy", () => {
  it.each(SORTS)("never orders nullable columns without a nulls rule (%s)", (sort) => {
    expect(collectNullableDesc(buildPublicJobOrderBy(sort))).toEqual([])
    expect(
      collectNullableDesc(buildPublicJobOrderBy(sort, { includeCompanyTier: true }))
    ).toEqual([])
  })

  it("puts undisclosed salaries last when sorting by highest salary", () => {
    expect(buildPublicJobOrderBy("salary_high")).toContainEqual({
      salaryMin: { sort: "desc", nulls: "last" },
    })
  })

  it("puts undisclosed salaries last when sorting by lowest salary", () => {
    expect(buildPublicJobOrderBy("salary_low")).toContainEqual({
      salaryMin: { sort: "asc", nulls: "last" },
    })
  })

  it("always leads with displayPriority", () => {
    for (const sort of SORTS) {
      expect(buildPublicJobOrderBy(sort)[0]).toEqual({ displayPriority: "asc" })
    }
  })
})

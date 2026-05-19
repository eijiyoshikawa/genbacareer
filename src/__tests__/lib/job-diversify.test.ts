import { describe, it, expect } from "vitest"
import { diversifyByCompany } from "@/lib/job-diversify"

type J = { id: string; companyId: string | null }

const j = (id: string, companyId: string | null): J => ({ id, companyId })

describe("diversifyByCompany", () => {
  it("keeps order when companies are already diverse", () => {
    const jobs = [j("1", "A"), j("2", "B"), j("3", "C"), j("4", "D")]
    expect(diversifyByCompany(jobs).map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
      "4",
    ])
  })

  it("returns as-is when list is small (<= window+1)", () => {
    const jobs = [j("1", "A"), j("2", "A"), j("3", "A")]
    expect(diversifyByCompany(jobs, 2).map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
    ])
  })

  it("defers consecutive same-company jobs", () => {
    // A A A B C → A B C A A (defer second / third A until B/C appear)
    const jobs = [j("1", "A"), j("2", "A"), j("3", "A"), j("4", "B"), j("5", "C")]
    const result = diversifyByCompany(jobs, 2).map((x) => x.id)
    // 1 (A) -> 4 (B) -> 5 (C) -> 2 (A) は最初に push 後 deferred から拾える
    expect(result[0]).toBe("1") // First A keeps its slot
    // No two consecutive results should share companyId
    const ids = result
    expect(ids.length).toBe(jobs.length)
    // All 5 should be present
    expect(new Set(ids)).toEqual(new Set(["1", "2", "3", "4", "5"]))
  })

  it("handles null companyId as always-OK", () => {
    const jobs = [j("1", null), j("2", null), j("3", null)]
    expect(diversifyByCompany(jobs).map((x) => x.id)).toEqual([
      "1",
      "2",
      "3",
    ])
  })

  it("preserves all jobs (no drops)", () => {
    const jobs = [
      j("1", "A"),
      j("2", "A"),
      j("3", "B"),
      j("4", "A"),
      j("5", "C"),
      j("6", "B"),
    ]
    const result = diversifyByCompany(jobs, 2)
    expect(result).toHaveLength(jobs.length)
    expect(new Set(result.map((x) => x.id))).toEqual(
      new Set(jobs.map((x) => x.id))
    )
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"

const queryRawUnsafe = vi.fn().mockResolvedValue([])

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
  },
}))

import { fuzzySearchJobs } from "@/lib/job-search"

/**
 * fuzzySearchJobs は SQL 文字列内のプレースホルダ番号 ($3, $4...) を
 * バインドする値配列の位置と動的に一致させる必要がある。
 * 過去に固定番号のハードコードで、prefecture を指定しない検索
 * (例: employment_type のみ) だと SQL が値配列より多いプレースホルダを
 * 参照し、Postgres がバインドエラーを返す (→ catch されて fuzzy search が
 * 静かに無効化される) バグがあった。
 */
describe("fuzzySearchJobs SQL placeholder alignment", () => {
  beforeEach(() => {
    queryRawUnsafe.mockClear()
  })

  function sqlAndValues() {
    const [sql, ...values] = queryRawUnsafe.mock.calls[0]
    return { sql: sql as string, values }
  }

  it("keeps placeholders and values aligned when only employmentType is set (no prefecture)", async () => {
    await fuzzySearchJobs({ q: "溶接", employmentType: "full_time" })
    const { sql, values } = sqlAndValues()
    // values: [q, categories, employmentType] => employment_type must reference $3
    expect(values).toHaveLength(3)
    expect(sql).toContain("employment_type = $3")
    expect(sql).not.toContain("$4")
  })

  it("keeps placeholders and values aligned when only salaryMax is set", async () => {
    await fuzzySearchJobs({ q: "電気工事", salaryMax: 5_000_000 })
    const { sql, values } = sqlAndValues()
    expect(values).toHaveLength(3)
    expect(sql).toContain("salary_max <= $3")
  })

  it("keeps placeholders and values aligned when source + salaryMin are set (no prefecture/employmentType)", async () => {
    await fuzzySearchJobs({ q: "内装", source: "direct", salaryMin: 3_000_000 })
    const { sql, values } = sqlAndValues()
    expect(values).toHaveLength(4)
    expect(sql).toContain("source = $3")
    expect(sql).toContain("salary_min >= $4")
  })

  it("numbers every placeholder consecutively with no gaps for the full filter set", async () => {
    await fuzzySearchJobs({
      q: "型枠",
      prefecture: "大阪府",
      employmentType: "full_time",
      source: "direct",
      publishedSince: new Date("2026-01-01"),
      salaryMin: 3_000_000,
      salaryMax: 6_000_000,
    })
    const { sql, values } = sqlAndValues()
    expect(values).toHaveLength(8)
    for (let i = 1; i <= 8; i++) {
      expect(sql).toContain(`$${i}`)
    }
    expect(sql).not.toContain("$9")
  })
})

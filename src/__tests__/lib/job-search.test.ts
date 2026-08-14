import { describe, it, expect, vi } from "vitest"

const queryRawUnsafe = vi.fn().mockResolvedValue([])

vi.mock("@/lib/db", () => ({
  prisma: {
    $queryRawUnsafe: (...args: unknown[]) => queryRawUnsafe(...args),
  },
}))

import { fuzzySearchJobs } from "@/lib/job-search"

// 以前は $3〜$8 がオプション条件の登場順ではなく固定スロットに割り当てられて
// おり、途中の条件（prefecture 等）が欠けると SQL のプレースホルダ番号と
// 実際にバインドされる params 配列の位置がずれて壊れていた。
// (例: prefecture 無し + employmentType 有りだと SQL は $4 を参照するが
//  params は 3 要素しか積まれず "$4" が存在しないエラーになっていた)
describe("fuzzySearchJobs SQL param binding", () => {
  it("keeps placeholder count in sync with bound params when an earlier optional filter is skipped", async () => {
    queryRawUnsafe.mockClear()
    await fuzzySearchJobs({
      q: "型枠大工",
      // prefecture is intentionally omitted while a later filter is set
      employmentType: "full_time",
      source: "direct",
    })

    expect(queryRawUnsafe).toHaveBeenCalledTimes(1)
    const [sql, ...params] = queryRawUnsafe.mock.calls[0]
    const placeholderNumbers = Array.from(
      new Set(Array.from(String(sql).matchAll(/\$(\d+)/g)).map((m) => Number(m[1])))
    ).sort((a, b) => a - b)
    const maxPlaceholder = placeholderNumbers.at(-1) ?? 0

    expect(maxPlaceholder).toBe(params.length)
    expect(placeholderNumbers).toEqual(
      Array.from({ length: maxPlaceholder }, (_, i) => i + 1)
    )
  })

  it("binds every combination of optional filters without gaps", async () => {
    const combos: Array<Partial<Parameters<typeof fuzzySearchJobs>[0]>> = [
      { source: "direct" },
      { employmentType: "full_time", salaryMax: 5_000_000 },
      { prefecture: "東京都", salaryMin: 3_000_000 },
      {
        prefecture: "東京都",
        employmentType: "full_time",
        source: "direct",
        publishedSince: new Date("2026-01-01"),
        salaryMin: 3_000_000,
        salaryMax: 5_000_000,
      },
    ]

    for (const extra of combos) {
      queryRawUnsafe.mockClear()
      await fuzzySearchJobs({ q: "電気工事", ...extra })
      const [sql, ...params] = queryRawUnsafe.mock.calls[0]
      const placeholderNumbers = Array.from(
        new Set(Array.from(String(sql).matchAll(/\$(\d+)/g)).map((m) => Number(m[1])))
      )
      const maxPlaceholder = Math.max(...placeholderNumbers)
      expect(maxPlaceholder).toBe(params.length)
    }
  })
})

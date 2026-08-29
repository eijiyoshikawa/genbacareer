import { describe, it, expect, vi } from "vitest"

const findManyMock = vi.fn().mockResolvedValue([])

vi.mock("@/lib/db", () => ({
  prisma: { job: { findMany: (...args: unknown[]) => findManyMock(...args) } },
}))

import {
  nextNotifiedWatermark,
  findNewMatchingJobs,
} from "@/lib/saved-searches"

describe("nextNotifiedWatermark", () => {
  const startedAt = new Date("2026-08-29T00:00:00Z")

  it("advances all the way to startedAt when fewer matches than the limit were found (nothing left pending)", () => {
    const matches = [{ publishedAt: new Date("2026-08-20T00:00:00Z") }]
    expect(nextNotifiedWatermark(matches, 5, startedAt)).toEqual(startedAt)
  })

  it("advances all the way to startedAt when there are no matches", () => {
    expect(nextNotifiedWatermark([], 5, startedAt)).toEqual(startedAt)
  })

  it("stops just past the last processed job when the batch is full, so remaining jobs aren't skipped over on the next run", () => {
    const last = new Date("2026-08-20T00:00:00Z")
    const matches = [
      { publishedAt: new Date("2026-08-18T00:00:00Z") },
      { publishedAt: new Date("2026-08-19T00:00:00Z") },
      { publishedAt: last },
    ]
    const watermark = nextNotifiedWatermark(matches, 3, startedAt)
    expect(watermark.getTime()).toBe(last.getTime() + 1)
    // 未来 (startedAt) まで進めていないので、この回で拾いきれなかった
    // since 以降の求人は次回 cron で再び対象になる。
    expect(watermark.getTime()).toBeLessThan(startedAt.getTime())
  })
})

describe("findNewMatchingJobs", () => {
  it("queries oldest-unprocessed-first so a large backlog is drained over successive runs instead of only ever showing the newest few", async () => {
    findManyMock.mockClear()
    await findNewMatchingJobs(
      {
        q: null,
        prefecture: null,
        city: null,
        category: null,
        employmentType: null,
        salaryMin: null,
        source: null,
        lastNotifiedAt: null,
        createdAt: new Date("2026-08-01T00:00:00Z"),
      },
      5
    )
    expect(findManyMock).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { publishedAt: "asc" }, take: 5 })
    )
  })
})

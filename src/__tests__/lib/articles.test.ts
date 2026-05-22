import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { publishedArticleFilter } from "@/lib/articles"

describe("publishedArticleFilter", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("returns status='published' and publishedAt<=now()", () => {
    const fixedNow = new Date("2026-05-10T00:00:00Z")
    vi.setSystemTime(fixedNow)

    const f = publishedArticleFilter()
    expect(f.status).toBe("published")
    expect(f.publishedAt).toEqual({ lte: fixedNow })
  })

  it("returns a fresh `now` on each call (real-time progression)", () => {
    vi.setSystemTime(new Date("2026-05-10T00:00:00Z"))
    const f1 = publishedArticleFilter()

    vi.setSystemTime(new Date("2026-05-11T00:00:00Z"))
    const f2 = publishedArticleFilter()

    expect((f1.publishedAt as { lte: Date }).lte.getTime()).toBeLessThan(
      (f2.publishedAt as { lte: Date }).lte.getTime()
    )
  })
})

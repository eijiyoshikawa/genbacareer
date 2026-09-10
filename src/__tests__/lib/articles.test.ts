import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  publishedArticleFilter,
  publishedMagazineArticleFilter,
} from "@/lib/articles"
import { MAGAZINE_CATEGORY_VALUES } from "@/lib/article-categories"

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

describe("publishedMagazineArticleFilter", () => {
  // Article テーブルはマガジン記事とヘルプ記事 (help-seeker / help-employer)
  // を共用しているため、/journal 系のクエリはこのヘルパーで必ず
  // マガジンの 6 カテゴリのみに絞らなければならない。
  it("restricts category to the 6 magazine categories only", () => {
    const f = publishedMagazineArticleFilter()
    expect(f.category).toEqual({ in: MAGAZINE_CATEGORY_VALUES })
  })

  it("excludes help-center categories", () => {
    const f = publishedMagazineArticleFilter()
    const allowed = f.category.in as readonly string[]
    expect(allowed).not.toContain("help-seeker")
    expect(allowed).not.toContain("help-employer")
  })

  it("still includes the base published/date filter", () => {
    const f = publishedMagazineArticleFilter()
    expect(f.status).toBe("published")
    expect(f.publishedAt).toBeDefined()
  })
})

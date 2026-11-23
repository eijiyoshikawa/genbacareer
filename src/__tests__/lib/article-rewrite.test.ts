import { describe, it, expect } from "vitest"
import {
  slugFromUrl,
  aggregatePageMetrics,
  scoreOpportunity,
  expectedCtrForPosition,
  selectCandidates,
  validateRewrite,
  parseRewriteJson,
  buildRewriteUserPrompt,
  type GscSnapshotRow,
  type RewriteArticle,
  type PageMetric,
} from "@/lib/article-rewrite"

function article(overrides: Partial<RewriteArticle> = {}): RewriteArticle {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "foo-bar",
    title: "建設業の給与事情",
    body: "<h2>はじめに</h2><p>" + "あ".repeat(800) + "</p>",
    excerpt: null,
    metaDescription: null,
    category: "salary",
    subcategory: null,
    tags: ["給与"],
    lastRewrittenAt: null,
    ...overrides,
  }
}

describe("slugFromUrl", () => {
  it("extracts slug from full journal URL", () => {
    expect(slugFromUrl("https://www.genbacareer.jp/journal/foo-bar")).toBe("foo-bar")
  })
  it("handles query/hash and trailing slash", () => {
    expect(slugFromUrl("https://x.jp/journal/foo-bar/?utm=a")).toBe("foo-bar")
    expect(slugFromUrl("https://x.jp/journal/foo-bar#sec")).toBe("foo-bar")
  })
  it("returns null for non-journal pages", () => {
    expect(slugFromUrl("https://x.jp/jobs/123")).toBe(null)
    expect(slugFromUrl("https://x.jp/journal")).toBe(null)
    expect(slugFromUrl("not a url")).toBe(null)
  })
})

describe("aggregatePageMetrics", () => {
  it("aggregates impressions/clicks and weighted position per page", () => {
    const rows: GscSnapshotRow[] = [
      { query: "建設 給与", page: "https://x.jp/journal/foo-bar", clicks: 2, impressions: 100, position: 8 },
      { query: "施工管理 年収", page: "https://x.jp/journal/foo-bar", clicks: 1, impressions: 100, position: 12 },
      { query: "無関係", page: "https://x.jp/jobs/1", clicks: 5, impressions: 999, position: 1 },
    ]
    const metrics = aggregatePageMetrics(rows)
    expect(metrics).toHaveLength(1) // jobs ページは除外
    const m = metrics[0]
    expect(m.slug).toBe("foo-bar")
    expect(m.impressions).toBe(200)
    expect(m.clicks).toBe(3)
    expect(m.position).toBeCloseTo(10) // (8*100+12*100)/200
    expect(m.ctr).toBeCloseTo(3 / 200)
    expect(m.topQueries[0].query).toBe("建設 給与") // impressions 同数なら先勝ち
    expect(m.topQueries).toHaveLength(2)
  })
})

describe("scoreOpportunity / expectedCtrForPosition", () => {
  it("expected CTR decreases with worse position", () => {
    expect(expectedCtrForPosition(1)).toBeGreaterThan(expectedCtrForPosition(5))
    expect(expectedCtrForPosition(5)).toBeGreaterThan(expectedCtrForPosition(15))
  })
  it("scores striking-distance high-impression low-CTR pages highest", () => {
    const strikingDistance = scoreOpportunity({ impressions: 1000, ctr: 0.005, position: 8 })
    const alreadyTop = scoreOpportunity({ impressions: 1000, ctr: 0.27, position: 1 })
    const deepOutOfRange = scoreOpportunity({ impressions: 1000, ctr: 0.001, position: 60 })
    expect(strikingDistance).toBeGreaterThan(alreadyTop)
    expect(strikingDistance).toBeGreaterThan(deepOutOfRange)
  })
  it("returns 0 for zero impressions", () => {
    expect(scoreOpportunity({ impressions: 0, ctr: 0, position: 5 })).toBe(0)
  })
})

describe("selectCandidates", () => {
  const metrics: PageMetric[] = [
    { page: "p1", slug: "high", impressions: 1000, clicks: 5, ctr: 0.005, position: 8, topQueries: [] },
    { page: "p2", slug: "low", impressions: 40, clicks: 1, ctr: 0.025, position: 9, topQueries: [] },
    { page: "p3", slug: "tiny", impressions: 10, clicks: 0, ctr: 0, position: 9, topQueries: [] },
    { page: "p4", slug: "cooldown", impressions: 800, clicks: 2, ctr: 0.0025, position: 10, topQueries: [] },
  ]
  const now = new Date("2026-06-07T00:00:00Z")
  const articles = [
    article({ slug: "high", id: "a-high" }),
    article({ slug: "low", id: "a-low" }),
    article({ slug: "tiny", id: "a-tiny" }),
    article({
      slug: "cooldown",
      id: "a-cd",
      lastRewrittenAt: new Date("2026-06-01T00:00:00Z"), // 6 日前 → クールダウン中
    }),
  ]

  it("excludes below-minImpressions and cooldown, sorts by score, respects limit", () => {
    const result = selectCandidates(metrics, articles, {
      limit: 2,
      minImpressions: 30,
      cooldownDays: 30,
      now,
    })
    const slugs = result.map((c) => c.metric.slug)
    expect(slugs).not.toContain("tiny") // impressions 不足
    expect(slugs).not.toContain("cooldown") // クールダウン中
    expect(slugs[0]).toBe("high") // 最高スコア
    expect(result.length).toBeLessThanOrEqual(2)
  })

  it("includes article only if a matching published article exists", () => {
    const result = selectCandidates(metrics, [article({ slug: "high" })], {
      limit: 5,
      now,
    })
    expect(result.map((c) => c.metric.slug)).toEqual(["high"])
  })

  it("excludes out-of-range positions beyond maxPosition", () => {
    const deep: PageMetric[] = [
      { page: "p", slug: "deep", impressions: 500, clicks: 1, ctr: 0.002, position: 63.9, topQueries: [] },
    ]
    const arts = [article({ slug: "deep" })]
    // 既定 maxPosition=40 → 圏外なので 0 件
    expect(selectCandidates(deep, arts, { limit: 5, now }).length).toBe(0)
    // 上限を緩めれば対象になる
    expect(
      selectCandidates(deep, arts, { limit: 5, maxPosition: 80, now }).length
    ).toBe(1)
  })

  it("allows rewrite once cooldown has passed", () => {
    const result = selectCandidates(
      metrics.filter((m) => m.slug === "cooldown"),
      [article({ slug: "cooldown", lastRewrittenAt: new Date("2026-01-01T00:00:00Z") })],
      { limit: 5, now }
    )
    expect(result.map((c) => c.metric.slug)).toEqual(["cooldown"])
  })
})

describe("validateRewrite", () => {
  const orig = article()
  it("accepts a reasonable rewrite", () => {
    const r = validateRewrite(orig, { body: "<h2>新</h2><p>" + "い".repeat(900) + "</p>" })
    expect(r.ok).toBe(true)
  })
  it("rejects empty body", () => {
    expect(validateRewrite(orig, { body: "   " })).toEqual({ ok: false, reason: "本文が空" })
  })
  it("rejects drastically shortened body", () => {
    const r = validateRewrite(orig, { body: "<p>短い</p>" })
    expect(r.ok).toBe(false)
  })
  it("rejects identical body", () => {
    const r = validateRewrite(orig, { body: orig.body })
    expect(r).toEqual({ ok: false, reason: "原文と同一（改善なし）" })
  })
  it("rejects runaway-long body", () => {
    const r = validateRewrite(orig, { body: "あ".repeat(orig.body.length * 4 + 5000) })
    expect(r.ok).toBe(false)
  })
  it("rejects over-long title", () => {
    const r = validateRewrite(orig, { body: "<p>" + "い".repeat(900) + "</p>", title: "x".repeat(201) })
    expect(r.ok).toBe(false)
  })
})

describe("parseRewriteJson", () => {
  it("parses plain JSON", () => {
    const r = parseRewriteJson('{"title":"T","body":"<p>B</p>","metaDescription":"M"}')
    expect(r).toEqual({ title: "T", body: "<p>B</p>", metaDescription: "M" })
  })
  it("strips ```json fences", () => {
    const r = parseRewriteJson('```json\n{"body":"<p>B</p>"}\n```')
    expect(r?.body).toBe("<p>B</p>")
  })
  it("returns null without a body", () => {
    expect(parseRewriteJson('{"title":"T"}')).toBe(null)
    expect(parseRewriteJson("not json")).toBe(null)
  })
})

describe("buildRewriteUserPrompt", () => {
  it("includes title, body and top queries", () => {
    const metric: PageMetric = {
      page: "p",
      slug: "foo-bar",
      impressions: 100,
      clicks: 2,
      ctr: 0.02,
      position: 8,
      topQueries: [{ query: "建設 給与", impressions: 100, clicks: 2, position: 8 }],
    }
    const prompt = buildRewriteUserPrompt(article(), metric)
    expect(prompt).toContain("建設業の給与事情")
    expect(prompt).toContain("建設 給与")
    expect(prompt).toContain("平均順位8.0")
  })
})

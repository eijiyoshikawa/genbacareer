import { describe, it, expect } from "vitest"
import {
  JOB_FEED_PLATFORMS,
  resolveFeedPlatform,
  buildJobUrlWithUtm,
} from "@/lib/job-feed-platforms"

describe("JOB_FEED_PLATFORMS", () => {
  it("has Indeed / 求人ボックス / スタンバイ / Glassdoor", () => {
    const ids = JOB_FEED_PLATFORMS.map((p) => p.id)
    expect(ids).toContain("indeed")
    expect(ids).toContain("kyujinbox")
    expect(ids).toContain("stanby")
    expect(ids).toContain("glassdoor")
  })

  it("all platforms have unique id", () => {
    const ids = JOB_FEED_PLATFORMS.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("all platforms have unique utmSource", () => {
    const utms = JOB_FEED_PLATFORMS.map((p) => p.utmSource)
    expect(new Set(utms).size).toBe(utms.length)
  })

  it("all platforms specify feedFormat", () => {
    for (const p of JOB_FEED_PLATFORMS) {
      expect(p.feedFormat).toBe("indeed_compat")
    }
  })

  it("all platforms have a label, registrationUrl", () => {
    for (const p of JOB_FEED_PLATFORMS) {
      expect(p.label).toBeTruthy()
      expect(p.registrationUrl).toMatch(/^https?:\/\//)
    }
  })
})

describe("resolveFeedPlatform", () => {
  it("resolves indeed", () => {
    expect(resolveFeedPlatform("indeed")?.id).toBe("indeed")
  })

  it("resolves kyujinbox case-insensitively", () => {
    expect(resolveFeedPlatform("KYUJINBOX")?.id).toBe("kyujinbox")
    expect(resolveFeedPlatform("Kyujinbox")?.id).toBe("kyujinbox")
  })

  it("returns null for unknown", () => {
    expect(resolveFeedPlatform("garbage")).toBe(null)
  })

  it("returns null for null / empty", () => {
    expect(resolveFeedPlatform(null)).toBe(null)
    expect(resolveFeedPlatform(undefined)).toBe(null)
    expect(resolveFeedPlatform("")).toBe(null)
  })
})

describe("buildJobUrlWithUtm", () => {
  it("returns base unchanged when platform is null", () => {
    expect(
      buildJobUrlWithUtm({
        base: "https://genbacareer.jp/jobs/abc",
        platform: null,
      }),
    ).toBe("https://genbacareer.jp/jobs/abc")
  })

  it("appends utm_source / utm_medium / utm_campaign", () => {
    const platform = resolveFeedPlatform("kyujinbox")!
    const url = buildJobUrlWithUtm({
      base: "https://genbacareer.jp/jobs/abc",
      platform,
    })
    expect(url).toContain("utm_source=kyujinbox")
    expect(url).toContain("utm_medium=feed")
    expect(url).toContain("utm_campaign=job_feed")
  })

  it("preserves existing query params", () => {
    const platform = resolveFeedPlatform("indeed")!
    const url = buildJobUrlWithUtm({
      base: "https://genbacareer.jp/jobs/abc?ref=test",
      platform,
    })
    const u = new URL(url)
    expect(u.searchParams.get("ref")).toBe("test")
    expect(u.searchParams.get("utm_source")).toBe("indeed")
  })

  it("overrides existing utm_source", () => {
    const platform = resolveFeedPlatform("indeed")!
    const url = buildJobUrlWithUtm({
      base: "https://genbacareer.jp/jobs/abc?utm_source=old",
      platform,
    })
    expect(new URL(url).searchParams.get("utm_source")).toBe("indeed")
  })
})

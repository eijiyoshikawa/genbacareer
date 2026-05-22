import { describe, it, expect } from "vitest"
import {
  buildLineApplyUrl,
  buildLineFriendAddUrl,
  buildLineMessage,
  isLineConfigured,
} from "@/lib/line"

const ctx = {
  jobId: "11111111-2222-3333-4444-555555555555",
  title: "施工管理（建築）/未経験OK",
  prefecture: "東京都",
  city: "新宿区",
  helloworkId: "13010-12345678",
}

describe("buildLineMessage", () => {
  it("includes title, id, location", () => {
    const msg = buildLineMessage(ctx)
    expect(msg).toContain("【応募希望】")
    expect(msg).toContain("施工管理（建築）/未経験OK")
    expect(msg).toContain("13010-12345678")
    expect(msg).toContain("東京都 新宿区")
  })

  it("falls back to job UUID when helloworkId is missing", () => {
    const msg = buildLineMessage({ ...ctx, helloworkId: null })
    expect(msg).toContain(ctx.jobId)
  })

  it("handles missing city gracefully", () => {
    const msg = buildLineMessage({ ...ctx, city: null })
    expect(msg).toContain("勤務地: 東京都")
    expect(msg).not.toContain(" null")
  })
})

describe("buildLineApplyUrl", () => {
  it("builds a line.me oaMessage url with encoded text", () => {
    const url = buildLineApplyUrl(ctx, "abcd1234")
    expect(url.startsWith("https://line.me/R/oaMessage/abcd1234/?")).toBe(true)
    expect(url).toContain(encodeURIComponent("【応募希望】"))
  })

  it("strips leading @ from Basic ID", () => {
    const url = buildLineApplyUrl(ctx, "@abcd1234")
    expect(url.startsWith("https://line.me/R/oaMessage/abcd1234/?")).toBe(true)
  })

  it("returns safe fallback when no Basic ID provided", () => {
    expect(buildLineApplyUrl(ctx, "")).toBe("/")
  })
})

describe("buildLineFriendAddUrl", () => {
  it("normalizes Basic ID to start with @", () => {
    expect(buildLineFriendAddUrl("abcd1234")).toBe(
      "https://line.me/R/ti/p/%40abcd1234"
    )
    expect(buildLineFriendAddUrl("@abcd1234")).toBe(
      "https://line.me/R/ti/p/%40abcd1234"
    )
  })

  it("returns / when Basic ID missing", () => {
    expect(buildLineFriendAddUrl("")).toBe("/")
  })
})

describe("isLineConfigured", () => {
  it("returns true for non-empty id", () => {
    expect(isLineConfigured("abcd")).toBe(true)
    expect(isLineConfigured("@abcd")).toBe(true)
  })

  it("returns false for empty id", () => {
    expect(isLineConfigured("")).toBe(false)
  })
})

import { describe, expect, it } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("keeps Japanese, ASCII, and common punctuation untouched", () => {
    expect(sanitizeOgText("急募!鉄筋工 月給30万円〜・寮完備")).toBe(
      "急募!鉄筋工 月給30万円〜・寮完備"
    )
  })

  it("strips decorative symbols that break next/og dynamic font loading", () => {
    expect(sanitizeOgText("◇大量募集◇未経験OK★")).toBe("大量募集未経験OK")
  })

  it("collapses whitespace left behind by stripped characters and trims", () => {
    expect(sanitizeOgText("  正社員 ★ 積算スタッフ ★  ")).toBe("正社員 積算スタッフ")
  })

  it("returns an empty string for input with nothing safe to keep", () => {
    expect(sanitizeOgText("★☆◆◇")).toBe("")
  })
})

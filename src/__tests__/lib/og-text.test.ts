import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("keeps ordinary Japanese and ASCII text untouched", () => {
    expect(sanitizeOgText("鉄筋工募集（未経験OK）月給30万円〜")).toBe(
      "鉄筋工募集（未経験OK）月給30万円〜"
    )
  })

  it("maps known math-operator lookalikes to safe CJK brackets", () => {
    expect(sanitizeOgText("≪急募≫鳶職人")).toBe("《急募》鳶職人")
  })

  it("strips glyphs outside the OGP font's coverage instead of crashing the route", () => {
    // ◇ (Geometric Shapes) previously 400'd the next/og dynamic font fetch
    // and crashed /opengraph-image entirely.
    expect(sanitizeOgText("◇建設スタッフ募集◇")).toBe("建設スタッフ募集")
  })

  it("strips emoji", () => {
    expect(sanitizeOgText("急募🔥高収入")).toBe("急募高収入")
  })
})

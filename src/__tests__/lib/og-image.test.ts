import { describe, expect, it } from "vitest"
import { sanitizeOgText, truncate } from "@/lib/og-image"

describe("sanitizeOgText", () => {
  it("removes dingbat/symbol characters that break next/og dynamic font fetch", () => {
    expect(sanitizeOgText("★経験者優遇★ 未経験OK")).toBe("経験者優遇 未経験OK")
  })

  it("removes geometric shape characters", () => {
    expect(sanitizeOgText("◇◆未経験歓迎◆◇")).toBe("未経験歓迎")
  })

  it("removes emoji including variation selectors", () => {
    expect(sanitizeOgText("🏗️建設業界🏗️の求人")).toBe("建設業界の求人")
  })

  it("leaves normal Japanese text untouched", () => {
    expect(sanitizeOgText("普通の求人タイトル 建築施工管理")).toBe(
      "普通の求人タイトル 建築施工管理"
    )
  })

  it("preserves the wave dash used in salary ranges", () => {
    expect(sanitizeOgText("400〜600万円")).toBe("400〜600万円")
  })

  it("collapses whitespace left behind after removal and trims", () => {
    expect(sanitizeOgText("  ★  急募  ★  ")).toBe("急募")
  })
})

describe("truncate", () => {
  it("returns the string unchanged when within the limit", () => {
    expect(truncate("短いタイトル", 60)).toBe("短いタイトル")
  })

  it("truncates and appends an ellipsis when over the limit", () => {
    expect(truncate("あ".repeat(70), 60)).toBe("あ".repeat(59) + "…")
  })
})

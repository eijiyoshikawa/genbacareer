import { describe, expect, it } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("strips decorative symbols used in recruiting ad titles", () => {
    expect(sanitizeOgText("◎急募◎未経験歓迎")).toBe("急募未経験歓迎")
    expect(sanitizeOgText("≪未経験OK≫施工管理")).toBe("未経験OK施工管理")
    expect(sanitizeOgText("【日払い可】土木作業員")).toBe("日払い可土木作業員")
  })

  it("collapses whitespace left behind after stripping", () => {
    expect(sanitizeOgText("土木作業員 ◇ 日払い可")).toBe("土木作業員 日払い可")
  })

  it("leaves ordinary Japanese text untouched", () => {
    expect(sanitizeOgText("施工管理・未経験歓迎・年収400万円〜")).toBe(
      "施工管理・未経験歓迎・年収400万円〜",
    )
  })

  it("handles empty input", () => {
    expect(sanitizeOgText("")).toBe("")
  })
})

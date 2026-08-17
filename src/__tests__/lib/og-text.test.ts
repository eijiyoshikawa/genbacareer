import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("strips decorative symbols that break next/og font loading", () => {
    expect(sanitizeOgText("★未経験者歓迎★")).toBe("未経験者歓迎")
    expect(sanitizeOgText("◇土日休み◇")).toBe("土日休み")
  })

  it("keeps Japanese text, alphanumerics, and common punctuation", () => {
    expect(sanitizeOgText("正社員募集中【年収500万円〜】")).toBe(
      "正社員募集中【年収500万円〜】"
    )
    expect(sanitizeOgText("ABC建設株式会社")).toBe("ABC建設株式会社")
  })

  it("collapses whitespace left behind after stripping", () => {
    expect(sanitizeOgText("急募 ★ 高収入")).toBe("急募 高収入")
  })

  it("handles empty strings", () => {
    expect(sanitizeOgText("")).toBe("")
  })
})

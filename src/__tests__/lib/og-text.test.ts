import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("通常の日本語・英数字はそのまま", () => {
    expect(sanitizeOgText("普通の求人タイトル ABC123 株式会社テスト")).toBe(
      "普通の求人タイトル ABC123 株式会社テスト"
    )
  })

  it("≪≫ は対応済みの CJK 括弧に置換", () => {
    expect(sanitizeOgText("≪限定≫募集")).toBe("《限定》募集")
  })

  it("next/og のフォントが対応しない装飾記号を除去する（◇★□）", () => {
    expect(sanitizeOgText("◇未経験者歓迎◇")).toBe("未経験者歓迎")
    expect(sanitizeOgText("★日払いOK★")).toBe("日払いOK")
    expect(sanitizeOgText("□要相談□")).toBe("要相談")
  })

  it("フォント未対応の全角チルダを除去する", () => {
    expect(sanitizeOgText("月給30万円～")).toBe("月給30万円")
  })

  it("記号除去後の連続空白を1つにまとめてトリムする", () => {
    expect(sanitizeOgText("  ★  月給30万円  ★  ")).toBe("月給30万円")
  })
})

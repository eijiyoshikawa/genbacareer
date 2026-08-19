import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("≪≫ を視覚的に近い《》へ置換する", () => {
    expect(sanitizeOgText("≪急募≫正社員")).toBe("《急募》正社員")
  })

  it("⇔ をスラッシュへ置換する", () => {
    expect(sanitizeOgText("正社員⇔契約社員")).toBe("正社員/契約社員")
  })

  it("本番で 400 が確認された記号（★◇⇔□）を除去する", () => {
    expect(sanitizeOgText("★急募★")).toBe("急募")
    expect(sanitizeOgText("◇未経験者歓迎◇")).toBe("未経験者歓迎")
    expect(sanitizeOgText("□正社員□")).toBe("正社員")
  })

  it("装飾記号を含む Unicode ブロック（矢印・数学記号・幾何学模様・記号・装飾記号）を除去する", () => {
    expect(sanitizeOgText("→")).toBe("")
    expect(sanitizeOgText("♪")).toBe("")
    expect(sanitizeOgText("✓")).toBe("")
    expect(sanitizeOgText("◆")).toBe("")
  })

  it("通常の日本語・英数字・句読点は変化しない", () => {
    expect(sanitizeOgText("求人情報〜正社員・アルバイト募集")).toBe(
      "求人情報〜正社員・アルバイト募集"
    )
    expect(sanitizeOgText("株式会社ABC 2026年度採用(20-30代)")).toBe(
      "株式会社ABC 2026年度採用(20-30代)"
    )
  })

  it("丸囲み数字（①②③）は除去対象から除外する", () => {
    expect(sanitizeOgText("①未経験可②土日休み③社保完備")).toBe(
      "①未経験可②土日休み③社保完備"
    )
  })

  it("空文字は空文字のまま", () => {
    expect(sanitizeOgText("")).toBe("")
  })
})

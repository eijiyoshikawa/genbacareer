import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("≪≫ を satori で解決できる 《》 に置換する", () => {
    expect(sanitizeOgText("≪急募≫")).toBe("《急募》")
  })

  it("動的フォント取得が失敗する装飾記号(◇□★⇔等)を除去する", () => {
    expect(sanitizeOgText("◇未経験歓迎◇日払いOK◇")).toBe("未経験歓迎日払いOK")
    expect(sanitizeOgText("□急募□正社員□")).toBe("急募正社員")
    expect(sanitizeOgText("★高収入★")).toBe("高収入")
    expect(sanitizeOgText("経験⇔未経験どちらも歓迎")).toBe("経験未経験どちらも歓迎")
  })

  it("記号除去後の連続空白・前後の空白を畳む", () => {
    expect(sanitizeOgText("  ◆現場作業員★  ")).toBe("現場作業員")
  })

  it("通常の日本語タイトルはそのまま", () => {
    expect(sanitizeOgText("施工管理スタッフ募集")).toBe("施工管理スタッフ募集")
  })
})

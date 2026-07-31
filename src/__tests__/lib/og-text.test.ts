import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("≪≫ を CJK の 《》 に正規化する", () => {
    expect(sanitizeOgText("≪急募≫ 電気工事士")).toBe("《急募》 電気工事士")
  })

  it("装飾記号 (◇★等) を除去する", () => {
    expect(sanitizeOgText("◇未経験歓迎◇ 土木作業員募集")).toBe(
      "未経験歓迎 土木作業員募集"
    )
    expect(sanitizeOgText("★高収入★ 重機オペレーター募集!!")).toBe(
      "高収入 重機オペレーター募集!!"
    )
  })

  it("絵文字を除去する", () => {
    expect(sanitizeOgText("🔥やる気重視🔥")).toBe("やる気重視")
  })

  it("通常の日本語・英数字・記号はそのまま", () => {
    expect(sanitizeOgText("建築施工管理技士 年収500万円〜")).toBe(
      "建築施工管理技士 年収500万円〜"
    )
    expect(sanitizeOgText("Hello World 123")).toBe("Hello World 123")
  })
})

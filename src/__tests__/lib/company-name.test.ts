import { describe, it, expect } from "vitest"
import { normalizeCompanyName } from "@/lib/company-name"

describe("normalizeCompanyName", () => {
  it("前株：全角スペースを詰める", () => {
    expect(normalizeCompanyName("株式会社　オザキ")).toBe("株式会社オザキ")
  })

  it("前株：半角スペースを詰める", () => {
    expect(normalizeCompanyName("株式会社 九州オーデン")).toBe(
      "株式会社九州オーデン"
    )
  })

  it("後株：社名の後ろの空白を詰める", () => {
    expect(normalizeCompanyName("オザキ　株式会社")).toBe("オザキ株式会社")
  })

  it("有限会社・医療法人社団なども対象", () => {
    expect(normalizeCompanyName("有限会社　山田工務店")).toBe(
      "有限会社山田工務店"
    )
    expect(normalizeCompanyName("医療法人社団　健康会")).toBe(
      "医療法人社団健康会"
    )
  })

  it("既に正規化済みは変化しない", () => {
    expect(normalizeCompanyName("株式会社オザキ")).toBe("株式会社オザキ")
  })

  it("社名内部の空白は保持する", () => {
    expect(normalizeCompanyName("株式会社　A ＆ B")).toBe("株式会社A ＆ B")
  })

  it("前後の余分な空白は trim、null/undefined は空文字", () => {
    expect(normalizeCompanyName("  株式会社テスト  ")).toBe("株式会社テスト")
    expect(normalizeCompanyName(null)).toBe("")
    expect(normalizeCompanyName(undefined)).toBe("")
  })
})

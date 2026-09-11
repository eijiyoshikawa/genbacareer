import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("フォント未対応の記号を ASCII / CJK 相当に置換する", () => {
    expect(sanitizeOgText("≪急募≫")).toBe("《急募》")
    expect(sanitizeOgText("◇未経験歓迎◇")).toBe("*未経験歓迎*")
    expect(sanitizeOgText("□資格不問")).toBe("*資格不問")
  })

  it("対象外の文字はそのまま", () => {
    expect(sanitizeOgText("普通の求人タイトル")).toBe("普通の求人タイトル")
  })

  it("空文字はそのまま", () => {
    expect(sanitizeOgText("")).toBe("")
  })
})

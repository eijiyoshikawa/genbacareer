import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("maps ≪≫ to CJK brackets", () => {
    expect(sanitizeOgText("≪急募≫鉄筋工")).toBe("《急募》鉄筋工")
  })

  it("replaces decorative shapes that break satori dynamic fonts", () => {
    expect(sanitizeOgText("◇未経験OK◇型枠大工")).toBe("未経験OK 型枠大工")
    expect(sanitizeOgText("□ 施工管理 ◇＋賞与")).toBe("施工管理 ＋賞与")
    expect(sanitizeOgText("★日払い可★解体工 🚧")).toBe("日払い可 解体工")
  })

  it("keeps ordinary Japanese text untouched", () => {
    expect(sanitizeOgText("【大阪】電気工事士（月給30万円〜）")).toBe(
      "【大阪】電気工事士（月給30万円〜）"
    )
  })
})

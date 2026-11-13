import { describe, expect, it } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("≪≫ を CJK 括弧に置換する", () => {
    expect(sanitizeOgText("≪急募≫大工")).toBe("《急募》大工")
  })

  it("本番で 400 になった幾何学記号を中黒に置換する", () => {
    expect(sanitizeOgText("型枠大工◇日払い□寮完備")).toBe("型枠大工・日払い・寮完備")
    expect(sanitizeOgText("◇＋手当あり")).toBe("＋手当あり")
  })

  it("連続する装飾記号は 1 つにまとめ、前後の装飾は除去する", () => {
    expect(sanitizeOgText("★☆未経験OK★☆◆◇月給30万")).toBe("未経験OK・月給30万")
  })

  it("通常の日本語・【】・全角記号はそのまま残す", () => {
    const s = "【正社員】施工管理（東京都）月給30万円〜／賞与あり！"
    expect(sanitizeOgText(s)).toBe(s)
  })

  it("罫線・Dingbats・絵文字・孤立サロゲートも置換する", () => {
    expect(sanitizeOgText("土木作業員│◇日給1.5万")).toBe("土木作業員・日給1.5万")
    expect(sanitizeOgText("✨未経験歓迎✔寮あり🏠")).toBe("未経験歓迎・寮あり")
    expect(sanitizeOgText("重機オペレーター\ud83c")).toBe("重機オペレーター")
  })
})

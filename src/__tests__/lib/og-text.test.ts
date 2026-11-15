import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("求人タイトルによくある装飾記号(◇★□等)を除去する", () => {
    expect(sanitizeOgText("◇未経験歓迎◇正社員募集")).toBe("未経験歓迎正社員募集")
    expect(sanitizeOgText("★急募★ 転勤なし □寮あり")).toBe("急募 転勤なし 寮あり")
  })

  it("罫線・ブロック要素(│─█等)を除去する", () => {
    expect(sanitizeOgText("│◇ 土木作業員 ─ 日払い可")).toBe("土木作業員 日払い可")
  })

  it("≪≫ は視覚的に同等な全角《》へ変換する", () => {
    expect(sanitizeOgText("≪高収入≫ドライバー募集")).toBe("《高収入》ドライバー募集")
  })

  it("通常の日本語・英数字・意味を持つ記号(矢印・丸数字・括弧)はそのまま残す", () => {
    expect(sanitizeOgText("普通の求人タイトル 株式会社サンプル")).toBe(
      "普通の求人タイトル 株式会社サンプル"
    )
    expect(sanitizeOgText("《大手企業》施工管理")).toBe("《大手企業》施工管理")
    expect(sanitizeOgText("【急募】①月給30万円→35万円")).toBe(
      "【急募】①月給30万円→35万円"
    )
  })
})

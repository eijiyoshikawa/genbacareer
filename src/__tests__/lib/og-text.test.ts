import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("日本語・英数字・一般的な記号はそのまま保持する", () => {
    expect(sanitizeOgText("月給25万円〜35万円 【急募】ABC123")).toBe(
      "月給25万円〜35万円 【急募】ABC123"
    )
  })

  it("既知の数学演算子記号を CJK 等価表現に置換する", () => {
    expect(sanitizeOgText("≪未経験者≫歓迎")).toBe("《未経験者》歓迎")
  })

  it("装飾的な幾何学記号を安全な等価表現に置換する", () => {
    expect(sanitizeOgText("★未経験者歓迎★ ◇土日休み◇")).toBe(
      "●未経験者歓迎● ○土日休み○"
    )
  })

  it("next/og のダイナミックフォントが対応しない文字（絵文字等）は除去する", () => {
    expect(sanitizeOgText("採用🎉情報")).toBe("採用情報")
  })
})

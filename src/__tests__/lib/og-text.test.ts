import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

/**
 * next/og (satori) は動的フォントをグリフ単位で取得するため、対応フォントの
 * ない記号 (≪≫ 等) を含む求人タイトル/企業名で fetch が 400 になり、OGP 画像から
 * 該当文字が無言で欠落していた (本番ログで 1 ヶ月以上継続確認)。同じ失敗モードを
 * 起こしうる建設業求人でよくある他の記号 (★☆→㎡℡丸数字ローマ数字) も潰す。
 */
describe("sanitizeOgText", () => {
  it("replaces mathematical angle brackets with CJK equivalents", () => {
    expect(sanitizeOgText("≪未経験歓迎≫")).toBe("《未経験歓迎》")
  })

  it("replaces common symbol characters seen in job titles", () => {
    expect(sanitizeOgText("★未経験歓迎★")).toBe("*未経験歓迎*")
    expect(sanitizeOgText("残業なし→即日勤務")).toBe("残業なし->即日勤務")
    expect(sanitizeOgText("施工面積50㎡")).toBe("施工面積50m2")
    expect(sanitizeOgText("①現場 ②事務")).toBe("(1)現場 (2)事務")
  })

  it("leaves ordinary Japanese text untouched", () => {
    const text = "建設現場スタッフ募集"
    expect(sanitizeOgText(text)).toBe(text)
  })
})

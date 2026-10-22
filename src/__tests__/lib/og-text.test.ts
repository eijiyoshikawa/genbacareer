import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

/**
 * next/og (satori) は動的フォントをグリフ単位で取得するため、対応フォントの
 * ない記号を含む求人タイトル/企業名で fetch が 400 になり、OGP 画像から該当文字が
 * 無言で欠落する。◇ / □ は /jobs/[id]/opengraph-image の本番エラーログで確認済み
 * (定期バグ検査)。
 */
describe("sanitizeOgText", () => {
  it("replaces mathematical angle brackets with CJK equivalents", () => {
    expect(sanitizeOgText("≪未経験歓迎≫")).toBe("《未経験歓迎》")
  })

  it("replaces geometric shape bullets seen in job titles", () => {
    expect(sanitizeOgText("◇未経験歓迎◇")).toBe("*未経験歓迎*")
    expect(sanitizeOgText("◆急募◆")).toBe("*急募*")
    expect(sanitizeOgText("□株式会社◯◯□")).toBe("*株式会社◯◯*")
    expect(sanitizeOgText("■重要■")).toBe("*重要*")
  })

  it("leaves ordinary Japanese text untouched", () => {
    const text = "建設現場スタッフ募集"
    expect(sanitizeOgText(text)).toBe(text)
  })
})

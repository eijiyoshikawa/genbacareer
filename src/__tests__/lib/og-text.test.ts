import { describe, expect, it } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("keeps ordinary Japanese and ASCII text untouched", () => {
    expect(sanitizeOgText("普通の求人タイトル(正社員)")).toBe(
      "普通の求人タイトル(正社員)"
    )
  })

  it("maps guillemets to CJK equivalents", () => {
    expect(sanitizeOgText("≪未経験歓迎≫")).toBe("《未経験歓迎》")
  })

  it("maps floor-area and phone marks to readable ASCII", () => {
    expect(sanitizeOgText("面積30㎡、℡:03-1234-5678")).toBe(
      "面積30m2、TEL:03-1234-5678"
    )
  })

  it("strips decorative symbols that satori's font fetch can't render", () => {
    expect(sanitizeOgText("◇建設作業員◇")).toBe("建設作業員")
    expect(sanitizeOgText("★急募★")).toBe("急募")
    expect(sanitizeOgText("□土木工事□")).toBe("土木工事")
  })

  it("strips emoji", () => {
    expect(sanitizeOgText("絵文字😀テスト")).toBe("絵文字テスト")
  })

  it("keeps wave dash, ellipsis, and fullwidth punctuation", () => {
    expect(sanitizeOgText("全角記号（）「」〜省略…")).toBe(
      "全角記号（）「」〜省略…"
    )
  })
})

import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("求人タイトルによくある装飾記号(◇★⇔□等)を除去する", () => {
    expect(sanitizeOgText("◇未経験歓迎◇正社員募集")).toBe("未経験歓迎 正社員募集")
    expect(sanitizeOgText("★急募★ 転勤なし⇔土日休み□寮あり")).toBe(
      "急募 転勤なし 土日休み 寮あり"
    )
  })

  it("≪≫ は視覚的に同等な全角《》へ変換する", () => {
    expect(sanitizeOgText("≪高収入≫ドライバー募集")).toBe("《高収入》ドライバー募集")
  })

  it("通常の日本語・英数字・全角文字はそのまま残す", () => {
    expect(sanitizeOgText("普通の求人タイトル 株式会社サンプル")).toBe(
      "普通の求人タイトル 株式会社サンプル"
    )
    expect(sanitizeOgText("ＡＢＣ１２３　全角テスト")).toBe("ＡＢＣ１２３ 全角テスト")
    expect(sanitizeOgText("《大手企業》施工管理")).toBe("《大手企業》施工管理")
  })

  it("未知の絵文字・記号も一般化されたレンジ外文字として除去する", () => {
    expect(sanitizeOgText("🎉新規オープン🎉スタッフ募集")).toBe(
      "新規オープン スタッフ募集"
    )
  })
})

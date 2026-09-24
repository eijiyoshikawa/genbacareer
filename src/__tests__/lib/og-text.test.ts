import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("日本語・英数字・記号はそのまま残す", () => {
    expect(sanitizeOgText("【急募】施工管理 未経験OK 月給30万円〜")).toBe(
      "【急募】施工管理 未経験OK 月給30万円〜",
    )
  })

  it("≪≫ は全角の《》に変換する", () => {
    expect(sanitizeOgText("≪未経験歓迎≫")).toBe("《未経験歓迎》")
  })

  it("本番で失敗が確認された装飾記号を除去する（フォント未対応でOGP生成が壊れるため）", () => {
    expect(sanitizeOgText("◇未経験歓迎◇")).toBe("未経験歓迎")
    expect(sanitizeOgText("□急募□")).toBe("急募")
    expect(sanitizeOgText("⇒直行直帰OK⇔土日休み")).toBe("直行直帰OK土日休み")
  })

  it("全角の記号・英数字は半角ASCIIに正規化する（＜＞ 等は全角のままだとフォント未対応で失敗するため）", () => {
    expect(sanitizeOgText("＜寮完備＞")).toBe("<寮完備>")
    expect(sanitizeOgText("ＡＢＣ１２３")).toBe("ABC123")
  })

  it("絵文字など未知の記号も範囲外として除去する", () => {
    expect(sanitizeOgText("大募集🔥急いで✨")).toBe("大募集急いで")
  })
})

import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("replaces ≪≫ with CJK-safe 《》", () => {
    expect(sanitizeOgText("≪急募≫")).toBe("《急募》")
  })

  it("strips decorative symbols with no CJK font coverage", () => {
    expect(sanitizeOgText("◇急募◇")).toBe("急募")
    expect(sanitizeOgText("◆未経験OK◆")).toBe("未経験OK")
    expect(sanitizeOgText("□正社員□")).toBe("正社員")
    expect(sanitizeOgText("■面接1回■")).toBe("面接1回")
    expect(sanitizeOgText("入社⇔退社")).toBe("入社退社")
  })

  it("replaces double arrows with a supported single arrow", () => {
    expect(sanitizeOgText("東京⇒大阪")).toBe("東京→大阪")
    expect(sanitizeOgText("大阪⇐東京")).toBe("大阪←東京")
  })

  it("leaves normal text untouched", () => {
    expect(sanitizeOgText("土木施工管理 / 東京都")).toBe("土木施工管理 / 東京都")
  })
})

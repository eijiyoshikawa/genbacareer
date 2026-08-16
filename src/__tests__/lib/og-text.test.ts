import { describe, it, expect } from "vitest"
import { sanitizeOgText } from "@/lib/og-text"

describe("sanitizeOgText", () => {
  it("maps ≪≫ to their CJK look-alikes", () => {
    expect(sanitizeOgText("≪必見≫")).toBe("《必見》")
  })

  it("strips decorative symbols the dynamic OG font can't render", () => {
    expect(sanitizeOgText("★急募★")).toBe("急募")
    expect(sanitizeOgText("◇未経験歓迎◇")).toBe("未経験歓迎")
  })

  it("leaves ordinary CJK and punctuation untouched", () => {
    expect(sanitizeOgText("土木施工管理 未経験歓迎〜月収30万円")).toBe(
      "土木施工管理 未経験歓迎〜月収30万円"
    )
  })

  it("handles empty string", () => {
    expect(sanitizeOgText("")).toBe("")
  })
})

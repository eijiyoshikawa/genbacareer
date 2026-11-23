import { describe, expect, it } from "vitest"
import { isHelloworkQuietHour } from "@/lib/crawler/rotation-planner"

describe("isHelloworkQuietHour", () => {
  it("本番で 0 件になっていた 16:00〜20:00 UTC (JST 01〜05 時) を停止窓と判定する", () => {
    for (const h of [16, 17, 18, 19, 20]) {
      expect(isHelloworkQuietHour(new Date(Date.UTC(2026, 10, 11, h, 0)))).toBe(true)
    }
  })

  it("取り込めていた 15:00 UTC (JST 0 時) と 21:00 UTC (JST 6 時) は実行する", () => {
    expect(isHelloworkQuietHour(new Date(Date.UTC(2026, 10, 11, 15, 0)))).toBe(false)
    expect(isHelloworkQuietHour(new Date(Date.UTC(2026, 10, 11, 21, 0)))).toBe(false)
    expect(isHelloworkQuietHour(new Date(Date.UTC(2026, 10, 11, 3, 0)))).toBe(false)
  })
})

import { describe, it, expect } from "vitest"
import { parsePage } from "@/lib/pagination"

describe("parsePage", () => {
  it("未指定なら 1", () => {
    expect(parsePage(undefined)).toBe(1)
  })

  it("正の整数文字列はそのまま数値化", () => {
    expect(parsePage("3")).toBe(3)
  })

  it("0 以下は 1 に切り上げる", () => {
    expect(parsePage("0")).toBe(1)
    expect(parsePage("-5")).toBe(1)
  })

  it("非数値文字列 (SQLi 探索等) は NaN にならず 1 にフォールバックする", () => {
    expect(parsePage("abc")).toBe(1)
    expect(parsePage("1' OR '1'='1")).toBe(1)
  })

  it("小数は切り捨てる", () => {
    expect(parsePage("2.9")).toBe(2)
  })
})

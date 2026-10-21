import { describe, it, expect } from "vitest"
import { parseIntParam } from "@/lib/pagination"

describe("parseIntParam", () => {
  it("null / 非数値はデフォルト", () => {
    expect(parseIntParam(null, 1, 1)).toBe(1)
    expect(parseIntParam("abc", 20, 1, 50)).toBe(20)
  })
  it("小数は切り捨て", () => {
    expect(parseIntParam("2.7", 1, 1)).toBe(2)
  })
  it("範囲にクランプ", () => {
    expect(parseIntParam("0", 1, 1)).toBe(1)
    expect(parseIntParam("-5", 1, 1)).toBe(1)
    expect(parseIntParam("999", 20, 1, 50)).toBe(50)
    expect(parseIntParam("Infinity", 1, 1)).toBe(1)
  })
})

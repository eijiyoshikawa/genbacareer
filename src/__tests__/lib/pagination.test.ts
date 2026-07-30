import { describe, it, expect } from "vitest"
import { parsePositiveInt } from "@/lib/pagination"

describe("parsePositiveInt", () => {
  it("parses a valid numeric string", () => {
    expect(parsePositiveInt("3", 1)).toBe(3)
  })

  it("floors non-integer values", () => {
    expect(parsePositiveInt("2.7", 1)).toBe(2)
  })

  it("falls back for undefined/null", () => {
    expect(parsePositiveInt(undefined, 1)).toBe(1)
    expect(parsePositiveInt(null, 1)).toBe(1)
  })

  it("falls back for non-numeric / SQLi-fuzzing style strings instead of returning NaN", () => {
    // Math.max(1, Number("abc")) === NaN — the bug this guards against.
    expect(parsePositiveInt("abc", 1)).toBe(1)
    expect(parsePositiveInt("1' OR '1'='1", 1)).toBe(1)
  })

  it("falls back for zero and negative values", () => {
    expect(parsePositiveInt("0", 1)).toBe(1)
    expect(parsePositiveInt("-5", 1)).toBe(1)
  })

  it("respects a custom fallback", () => {
    expect(parsePositiveInt("bad", 20)).toBe(20)
  })
})

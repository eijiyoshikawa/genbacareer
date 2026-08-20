import { describe, it, expect } from "vitest"
import { parsePageParam, parseLimitParam } from "@/lib/pagination"

describe("parsePageParam", () => {
  it("parses ordinary page numbers", () => {
    expect(parsePageParam("1")).toBe(1)
    expect(parsePageParam("7")).toBe(7)
  })

  // Math.max(1, Number("abc")) は NaN を返し、Prisma の skip に渡ると 500 になる
  it.each(["abc", "", "  ", null, undefined, "NaN"])(
    "falls back to 1 for non-numeric input (%s)",
    (raw) => {
      expect(parsePageParam(raw)).toBe(1)
    }
  )

  it("clamps out-of-range and non-finite values", () => {
    expect(parsePageParam("0")).toBe(1)
    expect(parsePageParam("-5")).toBe(1)
    expect(parsePageParam("1e999")).toBe(10_000)
    expect(parsePageParam("Infinity")).toBe(10_000)
  })

  it("always returns a finite integer", () => {
    for (const raw of ["abc", "0", "-1", "1e999", "2.7", "5"]) {
      const n = parsePageParam(raw)
      expect(Number.isSafeInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
    }
  })
})

describe("parseLimitParam", () => {
  it("parses ordinary limits", () => {
    expect(parseLimitParam("10", 20, 50)).toBe(10)
  })

  it("falls back for non-numeric input", () => {
    expect(parseLimitParam("abc", 20, 50)).toBe(20)
    expect(parseLimitParam(null, 20, 50)).toBe(20)
  })

  it("caps at the maximum and rejects non-positive values", () => {
    expect(parseLimitParam("999", 20, 50)).toBe(50)
    expect(parseLimitParam("1e999", 20, 50)).toBe(50)
    expect(parseLimitParam("0", 20, 50)).toBe(20)
    expect(parseLimitParam("-3", 20, 50)).toBe(20)
  })
})

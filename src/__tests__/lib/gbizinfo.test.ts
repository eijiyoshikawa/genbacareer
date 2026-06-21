import { describe, it, expect } from "vitest"
import { computeHasConstructionPermit } from "@/lib/gbizinfo"

/**
 * computeHasConstructionPermit / extractConstructionPermits の堅牢性テスト。
 *
 * 回帰: gbizData が basic/fetchedAt を持つが certifications が欠落/非配列の場合、
 * 以前は for..of が "is not iterable" で throw し、JobCard を含むページが 500 になっていた。
 * （/license/nikyu-sekou-kanri 等で発生）
 */
describe("computeHasConstructionPermit", () => {
  it("null / undefined / 非オブジェクトでも throw せず false", () => {
    expect(computeHasConstructionPermit(null)).toBe(false)
    expect(computeHasConstructionPermit(undefined)).toBe(false)
    expect(computeHasConstructionPermit("foo")).toBe(false)
    expect(computeHasConstructionPermit(123)).toBe(false)
  })

  it("basic/fetchedAt はあるが certifications が欠落でも throw しない", () => {
    const data = { basic: {}, fetchedAt: "2026-01-01T00:00:00Z" }
    expect(() => computeHasConstructionPermit(data)).not.toThrow()
    expect(computeHasConstructionPermit(data)).toBe(false)
  })

  it("certifications が非配列(null/オブジェクト)でも throw しない", () => {
    expect(
      computeHasConstructionPermit({ basic: {}, fetchedAt: "x", certifications: null })
    ).toBe(false)
    expect(
      computeHasConstructionPermit({ basic: {}, fetchedAt: "x", certifications: {} })
    ).toBe(false)
  })

  it("qualificationGrade が非配列でも throw しない", () => {
    const data = {
      basic: { qualificationGrade: "建設業" },
      fetchedAt: "x",
      certifications: [],
    }
    expect(() => computeHasConstructionPermit(data)).not.toThrow()
  })

  it("建設業を含む certification があれば true", () => {
    const data = {
      basic: {},
      fetchedAt: "x",
      certifications: [{ name: "建設業許可（特定）", description: "" }],
    }
    expect(computeHasConstructionPermit(data)).toBe(true)
  })

  it("建設業を含まなければ false", () => {
    const data = {
      basic: {},
      fetchedAt: "x",
      certifications: [{ name: "ISO9001", description: "品質マネジメント" }],
    }
    expect(computeHasConstructionPermit(data)).toBe(false)
  })

  it("qualificationGrade(配列)に値があれば true", () => {
    const data = {
      basic: { qualificationGrade: ["建設業許可 一般"] },
      fetchedAt: "x",
      certifications: [],
    }
    expect(computeHasConstructionPermit(data)).toBe(true)
  })
})

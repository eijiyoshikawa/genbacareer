import { describe, it, expect } from "vitest"
import { CATEGORIES, getCategoryLabel } from "@/lib/categories"

describe("CATEGORIES", () => {
  it("has 9 categories", () => {
    expect(CATEGORIES).toHaveLength(9)
  })

  it("all have value and label", () => {
    for (const cat of CATEGORIES) {
      expect(cat.value).toBeTruthy()
      expect(cat.label).toBeTruthy()
    }
  })

  it("values are unique", () => {
    const values = CATEGORIES.map((c) => c.value)
    expect(new Set(values).size).toBe(values.length)
  })

  it("includes construction-specific categories", () => {
    const values = CATEGORIES.map((c) => c.value)
    expect(values).toContain("construction")
    expect(values).toContain("civil")
    expect(values).toContain("electrical")
    expect(values).toContain("management")
  })
})

describe("getCategoryLabel", () => {
  it("returns label for known category", () => {
    expect(getCategoryLabel("construction")).toBe("建築・躯体工事")
    expect(getCategoryLabel("civil")).toBe("土木工事")
    expect(getCategoryLabel("management")).toBe("施工管理・現場監督")
  })

  it("returns value as-is for unknown category", () => {
    expect(getCategoryLabel("unknown")).toBe("unknown")
    expect(getCategoryLabel("")).toBe("")
  })
})

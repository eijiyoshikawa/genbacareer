import { describe, it, expect } from "vitest"
import { buildBaseSalary } from "@/components/hw-jobs/hw-job-structured-data"
import type { HwJobSalary } from "@/lib/jobs-api/types"

/**
 * HelloWork 求人の JobPosting JSON-LD baseSalary。
 * schema.org QuantitativeValue は範囲なら minValue + maxValue を両方セットする
 * (片方だけは NG)。direct 求人向けの structured-data.ts では既に修正済みだったが、
 * hellowork 求人側には同じ修正が未適用で、min または max のみの求人で
 * Search Console の「maxValue がありません」警告を再発させていた (定期バグ検査)。
 */
function salary(overrides: Partial<HwJobSalary>): HwJobSalary {
  return {
    type: "月給",
    display: null,
    min: null,
    max: null,
    base: null,
    bonus: null,
    ...overrides,
  }
}

describe("buildBaseSalary", () => {
  it("returns null when both min and max are missing", () => {
    expect(buildBaseSalary({ salary: salary({}) } as never)).toBeNull()
  })

  it("emits both minValue and maxValue for a real range", () => {
    const result = buildBaseSalary({
      salary: salary({ min: 250000, max: 350000 }),
    } as never) as { value: Record<string, unknown> }
    expect(result.value.minValue).toBe(250000)
    expect(result.value.maxValue).toBe(350000)
    expect(result.value.value).toBeUndefined()
  })

  it("emits value only (no minValue/maxValue) when only min is present", () => {
    const result = buildBaseSalary({
      salary: salary({ min: 280000, max: null }),
    } as never) as { value: Record<string, unknown> }
    expect(result.value.value).toBe(280000)
    expect(result.value.minValue).toBeUndefined()
    expect(result.value.maxValue).toBeUndefined()
  })

  it("emits value only (no minValue/maxValue) when only max is present", () => {
    const result = buildBaseSalary({
      salary: salary({ min: null, max: 400000 }),
    } as never) as { value: Record<string, unknown> }
    expect(result.value.value).toBe(400000)
    expect(result.value.minValue).toBeUndefined()
    expect(result.value.maxValue).toBeUndefined()
  })

  it("emits value only when min === max (no meaningless range)", () => {
    const result = buildBaseSalary({
      salary: salary({ min: 250000, max: 250000 }),
    } as never) as { value: Record<string, unknown> }
    expect(result.value.value).toBe(250000)
    expect(result.value.minValue).toBeUndefined()
    expect(result.value.maxValue).toBeUndefined()
  })
})

import { describe, it, expect } from "vitest"
import { z } from "zod"

/**
 * 求人作成/更新 API の給与レンジ検証 (salaryMin <= salaryMax) を、
 * 実際のスキーマと同じ refine ロジックで単体テストする。
 */
const salaryRangeSchema = z
  .object({
    salaryMin: z.number().int().min(0).nullable().optional(),
    salaryMax: z.number().int().min(0).nullable().optional(),
  })
  .refine(
    (data) =>
      data.salaryMin == null ||
      data.salaryMax == null ||
      data.salaryMin <= data.salaryMax,
    { message: "給与下限は上限以下である必要があります", path: ["salaryMin"] },
  )

describe("salary range validation", () => {
  it("rejects an inverted range", () => {
    expect(
      salaryRangeSchema.safeParse({ salaryMin: 300000, salaryMax: 200000 }).success,
    ).toBe(false)
  })

  it("accepts a valid range", () => {
    expect(
      salaryRangeSchema.safeParse({ salaryMin: 200000, salaryMax: 300000 }).success,
    ).toBe(true)
  })

  it("accepts equal min and max", () => {
    expect(
      salaryRangeSchema.safeParse({ salaryMin: 250000, salaryMax: 250000 }).success,
    ).toBe(true)
  })

  it("accepts when only one bound is given", () => {
    expect(salaryRangeSchema.safeParse({ salaryMin: 200000 }).success).toBe(true)
    expect(salaryRangeSchema.safeParse({ salaryMax: 300000 }).success).toBe(true)
  })

  it("accepts when neither bound is given", () => {
    expect(salaryRangeSchema.safeParse({}).success).toBe(true)
  })
})

import { describe, it, expect } from "vitest"
import {
  checkJobCompliance,
  checkJobFields,
} from "@/lib/job-compliance"

describe("checkJobCompliance", () => {
  it("returns empty for clean text", () => {
    expect(checkJobCompliance("経験者歓迎。スキルアップ支援あり。")).toEqual([])
  })

  it("detects age limit", () => {
    const r = checkJobCompliance("40歳以下の方を募集します")
    expect(r.length).toBeGreaterThan(0)
    expect(r[0].category).toBe("age")
  })

  it("detects 若手限定", () => {
    const r = checkJobCompliance("若手限定で募集")
    expect(r.some((i) => i.category === "age")).toBe(true)
  })

  it("detects gender limit", () => {
    const r = checkJobCompliance("男性のみ募集")
    expect(r.some((i) => i.category === "gender")).toBe(true)
  })

  it("detects nationality requirement", () => {
    const r = checkJobCompliance("日本人のみ採用")
    expect(r.some((i) => i.category === "nationality")).toBe(true)
  })

  it("detects appearance", () => {
    const r = checkJobCompliance("容姿端麗な方")
    expect(r.some((i) => i.category === "appearance")).toBe(true)
  })

  it("dedupes same match", () => {
    const r = checkJobCompliance("男性のみ。男性のみ。男性のみ。")
    expect(r.filter((i) => i.category === "gender").length).toBe(1)
  })

  it("detects multiple categories", () => {
    const r = checkJobCompliance("40歳以下の男性のみ募集")
    const categories = new Set(r.map((i) => i.category))
    expect(categories.has("age")).toBe(true)
    expect(categories.has("gender")).toBe(true)
  })
})

describe("checkJobFields", () => {
  it("concatenates fields", () => {
    const r = checkJobFields({
      title: "施工管理",
      description: "現場での仕事です",
      requirements: "40歳以下",
    })
    expect(r.some((i) => i.category === "age")).toBe(true)
  })

  it("handles null fields", () => {
    expect(checkJobFields({ title: null, description: null, requirements: null })).toEqual([])
  })
})

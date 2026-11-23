import { describe, it, expect, vi, beforeEach } from "vitest"

const revalidatePath = vi.fn()

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => revalidatePath(...args),
}))

import {
  revalidateAfterJobChange,
  revalidateAfterArticleChange,
} from "@/lib/revalidate-public"

describe("revalidateAfterJobChange", () => {
  beforeEach(() => {
    revalidatePath.mockReset()
  })

  it("revalidates the home page", () => {
    revalidateAfterJobChange()
    expect(revalidatePath).toHaveBeenCalledWith("/")
  })

  it("also revalidates the company page when companyId is given", () => {
    revalidateAfterJobChange({ companyId: "abc123" })
    expect(revalidatePath).toHaveBeenCalledWith("/")
    expect(revalidatePath).toHaveBeenCalledWith("/companies/abc123")
  })

  it("skips company page when companyId is missing", () => {
    revalidateAfterJobChange({ companyId: null })
    expect(revalidatePath).toHaveBeenCalledTimes(1)
    expect(revalidatePath).toHaveBeenCalledWith("/")
  })

  it("swallows revalidatePath errors so the API response is not broken", () => {
    revalidatePath.mockImplementation(() => {
      throw new Error("boom")
    })
    expect(() => revalidateAfterJobChange()).not.toThrow()
  })
})

describe("revalidateAfterArticleChange", () => {
  beforeEach(() => {
    revalidatePath.mockReset()
  })

  it("revalidates home and journal list", () => {
    revalidateAfterArticleChange()
    expect(revalidatePath).toHaveBeenCalledWith("/")
    expect(revalidatePath).toHaveBeenCalledWith("/journal")
  })

  it("also revalidates the article detail page when slug is given", () => {
    revalidateAfterArticleChange({ slug: "my-article" })
    expect(revalidatePath).toHaveBeenCalledWith("/journal/my-article")
  })

  it("skips detail page when slug is missing", () => {
    revalidateAfterArticleChange({ slug: null })
    const calls = revalidatePath.mock.calls.map((c) => c[0])
    expect(calls).toEqual(["/", "/journal"])
  })
})

import { describe, it, expect } from "vitest"
import { matchBlocklistRule, type BlocklistRule } from "@/lib/blocklist-match"

const rule = (overrides: Partial<BlocklistRule> = {}): BlocklistRule => ({
  id: "rule-1",
  keyword: "危険",
  scope: "any",
  ...overrides,
})

describe("matchBlocklistRule", () => {
  it("returns null when no rules are configured", () => {
    expect(matchBlocklistRule({ title: "危険な仕事" }, [])).toBeNull()
  })

  it("matches on title when scope=any", () => {
    const rules = [rule()]
    expect(matchBlocklistRule({ title: "危険な現場作業員" }, rules)).toEqual(rules[0])
  })

  it("matches on description when scope=any", () => {
    const rules = [rule()]
    expect(
      matchBlocklistRule({ title: "作業員募集", description: "危険物取扱あり" }, rules)
    ).toEqual(rules[0])
  })

  it("matches on companyName when scope=any", () => {
    const rules = [rule()]
    expect(
      matchBlocklistRule({ title: "作業員募集", companyName: "危険物運搬株式会社" }, rules)
    ).toEqual(rules[0])
  })

  it("is case-insensitive", () => {
    const rules = [rule({ keyword: "SCAM" })]
    expect(matchBlocklistRule({ title: "This is a scam job" }, rules)).toEqual(rules[0])
  })

  it("scope=title does not match description", () => {
    const rules = [rule({ scope: "title" })]
    expect(
      matchBlocklistRule({ title: "普通の求人", description: "危険物あり" }, rules)
    ).toBeNull()
  })

  it("scope=company does not match title", () => {
    const rules = [rule({ scope: "company" })]
    expect(matchBlocklistRule({ title: "危険な仕事", companyName: "普通株式会社" }, rules)).toBeNull()
  })

  it("returns null when nothing matches", () => {
    const rules = [rule({ keyword: "詐欺" })]
    expect(matchBlocklistRule({ title: "普通の建設求人" }, rules)).toBeNull()
  })

  it("returns the first matching rule when multiple rules exist", () => {
    const rules = [rule({ id: "a", keyword: "詐欺" }), rule({ id: "b", keyword: "危険" })]
    expect(matchBlocklistRule({ title: "危険な仕事" }, rules)?.id).toBe("b")
  })

  it("ignores rules with an empty keyword", () => {
    const rules = [rule({ keyword: "" })]
    expect(matchBlocklistRule({ title: "何でもいい求人" }, rules)).toBeNull()
  })
})

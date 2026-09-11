import { describe, it, expect } from "vitest"
import { matchBlocklist, type BlocklistEntry } from "@/lib/blocklist-match"

describe("matchBlocklist", () => {
  const entry = (over: Partial<BlocklistEntry> = {}): BlocklistEntry => ({
    id: "1",
    keyword: "テスト",
    scope: "any",
    ...over,
  })

  it("returns null when no entries match", () => {
    expect(
      matchBlocklist([entry({ keyword: "詐欺" })], {
        title: "鳶職人募集",
        description: "屋根工事です",
        companyName: "株式会社サンプル",
      })
    ).toBeNull()
  })

  it("matches keyword in title regardless of scope=any", () => {
    const e = entry({ keyword: "闇バイト" })
    expect(
      matchBlocklist([e], { title: "闇バイト急募", description: null, companyName: null })
    ).toEqual(e)
  })

  it("respects scope=title (does not match description hits)", () => {
    const e = entry({ keyword: "危険", scope: "title" })
    expect(
      matchBlocklist([e], {
        title: "普通の求人",
        description: "危険物を扱う可能性があります",
        companyName: null,
      })
    ).toBeNull()
    expect(
      matchBlocklist([e], { title: "危険な仕事", description: null, companyName: null })
    ).toEqual(e)
  })

  it("respects scope=company", () => {
    const e = entry({ keyword: "ブラック商事", scope: "company" })
    expect(
      matchBlocklist([e], {
        title: "作業員募集",
        description: null,
        companyName: "株式会社ブラック商事",
      })
    ).toEqual(e)
    expect(
      matchBlocklist([e], {
        title: "ブラック商事の作業員募集",
        description: null,
        companyName: "株式会社サンプル",
      })
    ).toBeNull()
  })

  it("respects scope=description", () => {
    const e = entry({ keyword: "自動車修理", scope: "description" })
    expect(
      matchBlocklist([e], {
        title: "板金工",
        description: "自動車修理の板金塗装をお願いします",
        companyName: null,
      })
    ).toEqual(e)
  })

  it("is case-insensitive", () => {
    const e = entry({ keyword: "ABC", scope: "title" })
    expect(
      matchBlocklist([e], { title: "abc job", description: null, companyName: null })
    ).toEqual(e)
  })

  it("skips blank keywords without matching everything", () => {
    const e = entry({ keyword: "   ", scope: "any" })
    expect(
      matchBlocklist([e], { title: "何でも", description: null, companyName: null })
    ).toBeNull()
  })

  it("returns the first matching entry when multiple match", () => {
    const first = entry({ id: "first", keyword: "工事" })
    const second = entry({ id: "second", keyword: "工事" })
    expect(
      matchBlocklist([first, second], {
        title: "工事現場作業員",
        description: null,
        companyName: null,
      })
    ).toEqual(first)
  })
})

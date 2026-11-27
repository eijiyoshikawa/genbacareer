import { describe, it, expect } from "vitest"
import { matchBlocklist } from "@/lib/crawler/import-batch"

const job = {
  title: "土木作業員",
  description: "高収入！簡単な副業あり",
  companyName: "株式会社サンプル建設",
}

describe("matchBlocklist", () => {
  it("ルールが無ければ一致しない", () => {
    expect(matchBlocklist(job, [])).toBeNull()
  })

  it("scope=any はタイトル・本文・会社名のどれでも一致する", () => {
    expect(matchBlocklist(job, [{ id: "1", keyword: "副業", scope: "any" }])?.id).toBe("1")
    expect(matchBlocklist(job, [{ id: "2", keyword: "サンプル建設", scope: "any" }])?.id).toBe("2")
  })

  it("scope を指定すると他の項目では一致しない", () => {
    expect(matchBlocklist(job, [{ id: "1", keyword: "副業", scope: "title" }])).toBeNull()
    expect(matchBlocklist(job, [{ id: "1", keyword: "副業", scope: "description" }])?.id).toBe("1")
    expect(matchBlocklist(job, [{ id: "1", keyword: "土木", scope: "company" }])).toBeNull()
  })

  it("大文字小文字を区別せず、空のキーワードは無視する", () => {
    const j = { title: "CAD Operator", description: null, companyName: null }
    expect(matchBlocklist(j, [{ id: "1", keyword: " ", scope: "any" }])).toBeNull()
    expect(matchBlocklist(j, [{ id: "2", keyword: "cad", scope: "title" }])?.id).toBe("2")
  })
})

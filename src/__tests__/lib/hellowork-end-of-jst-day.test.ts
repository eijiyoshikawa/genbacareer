import { describe, expect, it } from "vitest"
import { endOfJstDay } from "@/lib/crawler/hellowork"

describe("endOfJstDay", () => {
  it("日付のみの有効期限を、その日の 23:59:59.999 JST にする", () => {
    const d = endOfJstDay(new Date(Date.UTC(2026, 10, 30)))
    expect(d?.toISOString()).toBe("2026-11-30T14:59:59.999Z")
  })

  it("null はそのまま返す", () => {
    expect(endOfJstDay(null)).toBeNull()
  })
})

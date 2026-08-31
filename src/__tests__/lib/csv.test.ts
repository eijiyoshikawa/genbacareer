import { describe, expect, it } from "vitest"
import { csvEscape } from "@/lib/csv"

describe("csvEscape", () => {
  it("returns empty string for null/undefined", () => {
    expect(csvEscape(null)).toBe("")
    expect(csvEscape(undefined)).toBe("")
  })

  it("passes through plain values unchanged", () => {
    expect(csvEscape("田中太郎")).toBe("田中太郎")
    expect(csvEscape(123)).toBe("123")
  })

  it("quotes values containing comma, quote, or newline", () => {
    expect(csvEscape("a,b")).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"')
  })

  it("neutralizes leading formula characters to prevent CSV injection", () => {
    expect(csvEscape("=cmd|'/c calc'!A1")).toBe("'=cmd|'/c calc'!A1")
    expect(csvEscape("+1234")).toBe("'+1234")
    expect(csvEscape("-1234")).toBe("'-1234")
    expect(csvEscape("@SUM(A1:A2)")).toBe("'@SUM(A1:A2)")
  })

  it("quotes a neutralized value that also contains a comma", () => {
    expect(csvEscape("=A1,B1")).toBe('"\'=A1,B1"')
  })
})

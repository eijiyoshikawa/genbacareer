import { describe, it, expect } from "vitest"

/**
 * admin UI の <input type="date"> (YYYY-MM-DD) を Date に変換する際、
 * JST (UTC+9) の意図した日付境界で解釈されることを検証する。
 * 素朴に `new Date("YYYY-MM-DD")` を使うと UTC 深夜 0 時 (= JST 朝 9 時) になり、
 * 契約終了日の意図より最大 15 時間早くプランが失効してしまう。
 * ロジックは src/app/api/admin/companies/[id]/plan/route.ts と同一。
 */

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/

function parsePaidUntil(value: string): Date {
  if (DATE_ONLY_RE.test(value)) {
    return new Date(`${value}T23:59:59.999+09:00`)
  }
  return new Date(value)
}

function parseActivatedAt(value: string): Date {
  if (DATE_ONLY_RE.test(value)) {
    return new Date(`${value}T00:00:00+09:00`)
  }
  return new Date(value)
}

describe("admin plan date parsing", () => {
  it("parsePaidUntil: 日付のみの入力は JST のその日の終わりとして解釈する", () => {
    const parsed = parsePaidUntil("2026-10-01")
    // JST 2026-10-01 23:59:59.999 == UTC 2026-10-01 14:59:59.999
    expect(parsed.toISOString()).toBe("2026-10-01T14:59:59.999Z")
  })

  it("parsePaidUntil: cron 実行時刻 (14:00 JST = 05:00 UTC) 時点でまだ有効", () => {
    const parsed = parsePaidUntil("2026-10-01")
    const cronRunAt = new Date("2026-10-01T05:00:00Z") // 14:00 JST 同日
    expect(parsed.getTime() > cronRunAt.getTime()).toBe(true)
  })

  it("parsePaidUntil: 完全な ISO datetime はそのまま解釈する", () => {
    const parsed = parsePaidUntil("2026-10-01T05:00:00.000Z")
    expect(parsed.toISOString()).toBe("2026-10-01T05:00:00.000Z")
  })

  it("parseActivatedAt: 日付のみの入力は JST のその日の始まりとして解釈する", () => {
    const parsed = parseActivatedAt("2026-10-01")
    // JST 2026-10-01 00:00:00 == UTC 2026-09-30 15:00:00
    expect(parsed.toISOString()).toBe("2026-09-30T15:00:00.000Z")
  })
})

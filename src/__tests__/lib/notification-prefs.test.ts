import { describe, it, expect } from "vitest"
import {
  DEFAULT_PREFS,
  parsePrefs,
  isInQuietHours,
  digestHourJst,
} from "@/lib/notification-prefs"

describe("DEFAULT_PREFS", () => {
  it("has scoutEnabled = true by default", () => {
    expect(DEFAULT_PREFS.scoutEnabled).toBe(true)
  })

  it("has all channel toggles enabled by default", () => {
    expect(DEFAULT_PREFS.emailEnabled).toBe(true)
    expect(DEFAULT_PREFS.lineEnabled).toBe(true)
    expect(DEFAULT_PREFS.pushEnabled).toBe(true)
  })
})

describe("parsePrefs", () => {
  it("returns defaults for null", () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS)
  })

  it("returns defaults for non-object", () => {
    expect(parsePrefs("invalid")).toEqual(DEFAULT_PREFS)
    expect(parsePrefs(123)).toEqual(DEFAULT_PREFS)
  })

  it("preserves scoutEnabled when explicitly false", () => {
    const result = parsePrefs({ scoutEnabled: false })
    expect(result.scoutEnabled).toBe(false)
  })

  it("falls back to default scoutEnabled for invalid type", () => {
    const result = parsePrefs({ scoutEnabled: "yes" })
    expect(result.scoutEnabled).toBe(true)
  })

  it("normalizes quietHoursStart out of range to null", () => {
    expect(parsePrefs({ quietHoursStart: 30 }).quietHoursStart).toBe(null)
    expect(parsePrefs({ quietHoursStart: -1 }).quietHoursStart).toBe(null)
  })

  it("preserves valid quietHoursStart", () => {
    expect(parsePrefs({ quietHoursStart: 22 }).quietHoursStart).toBe(22)
  })

  it("accepts valid frequency", () => {
    expect(parsePrefs({ frequency: "daily" }).frequency).toBe("daily")
    expect(parsePrefs({ frequency: "weekly" }).frequency).toBe("weekly")
  })

  it("falls back to default frequency for invalid", () => {
    expect(parsePrefs({ frequency: "hourly" }).frequency).toBe("immediate")
  })
})

describe("isInQuietHours", () => {
  it("returns false if start or end is null", () => {
    expect(
      isInQuietHours({
        ...DEFAULT_PREFS,
        quietHoursStart: null,
        quietHoursEnd: 7,
      }),
    ).toBe(false)
  })

  it("handles standard window (9-18 JST)", () => {
    // 12:00 UTC = 21:00 JST → outside 9-18 window
    const at = new Date("2026-05-21T12:00:00Z")
    expect(
      isInQuietHours(
        { ...DEFAULT_PREFS, quietHoursStart: 9, quietHoursEnd: 18 },
        at,
      ),
    ).toBe(false)
  })

  it("handles overnight window (22-7 JST)", () => {
    // 14:00 UTC = 23:00 JST → inside 22-7 window
    const at = new Date("2026-05-21T14:00:00Z")
    expect(
      isInQuietHours(
        { ...DEFAULT_PREFS, quietHoursStart: 22, quietHoursEnd: 7 },
        at,
      ),
    ).toBe(true)
  })
})

describe("digestHourJst", () => {
  it("静音時間が無ければ 9 時", () => {
    expect(digestHourJst(DEFAULT_PREFS)).toBe(9)
    expect(digestHourJst(DEFAULT_PREFS, { afterQuietHours: true })).toBe(9)
  })

  it("9 時が静音時間に入っていれば、静音の終了時刻に送る", () => {
    const work = { ...DEFAULT_PREFS, quietHoursStart: 8, quietHoursEnd: 17 }
    expect(digestHourJst(work)).toBe(17)
    const lateSleeper = { ...DEFAULT_PREFS, quietHoursStart: 23, quietHoursEnd: 11 }
    expect(digestHourJst(lateSleeper)).toBe(11)
  })

  it("9 時が静音時間の外なら 9 時のまま", () => {
    const night = { ...DEFAULT_PREFS, quietHoursStart: 22, quietHoursEnd: 7 }
    expect(digestHourJst(night)).toBe(9)
  })

  it("即時配信の取りこぼし救済は、静音の終了時刻に送る", () => {
    const night = { ...DEFAULT_PREFS, quietHoursStart: 22, quietHoursEnd: 7 }
    expect(digestHourJst(night, { afterQuietHours: true })).toBe(7)
  })

  it("配信時刻は静音時間の外になる", () => {
    for (let s = 0; s < 24; s++) {
      for (let e = 0; e < 24; e++) {
        const prefs = { ...DEFAULT_PREFS, quietHoursStart: s, quietHoursEnd: e }
        for (const afterQuietHours of [false, true]) {
          const hour = digestHourJst(prefs, { afterQuietHours })
          // hour 時 (JST) = hour - 9 時 (UTC)
          const at = new Date(Date.UTC(2026, 4, 21, (hour + 15) % 24, 30))
          expect(isInQuietHours(prefs, at)).toBe(false)
        }
      }
    }
  })
})

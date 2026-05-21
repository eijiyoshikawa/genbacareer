import { describe, it, expect } from "vitest"
import {
  DEFAULT_PREFS,
  parsePrefs,
  isInQuietHours,
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

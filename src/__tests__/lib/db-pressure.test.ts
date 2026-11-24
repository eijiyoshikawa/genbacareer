import { describe, it, expect, vi } from "vitest"

vi.mock("@prisma/client", () => ({
  PrismaClient: class {},
}))

import {
  isDbUnderPressure,
  isPoolExhaustionError,
  markDbPressure,
  noteDbError,
} from "@/lib/db"

describe("isPoolExhaustionError", () => {
  it("detects Prisma pool timeouts by code", () => {
    expect(isPoolExhaustionError({ code: "P2024" })).toBe(true)
  })

  it("detects Supabase pooler checkout failures by message", () => {
    expect(
      isPoolExhaustionError(
        new Error(
          "Error in connector: Error querying the database: FATAL: (ECHECKOUTTIMEOUT) unable to check out connection from the pool after 60000ms in Transaction mode"
        )
      )
    ).toBe(true)
    expect(
      isPoolExhaustionError(
        new Error("FATAL: (ECHECKOUTRETRIES) failed to check out a connection after multiple retries")
      )
    ).toBe(true)
  })

  it("does not treat ordinary query errors as exhaustion", () => {
    expect(isPoolExhaustionError(new Error("function similarity(text, text) does not exist"))).toBe(false)
    expect(isPoolExhaustionError({ code: "P2022" })).toBe(false)
    expect(isPoolExhaustionError(null)).toBe(false)
  })
})

describe("db pressure window", () => {
  it("is on right after an exhaustion error and off once the window passes", () => {
    const t0 = 1_000_000
    expect(isDbUnderPressure(t0)).toBe(false)
    markDbPressure(t0)
    expect(isDbUnderPressure(t0 + 1_000)).toBe(true)
    expect(isDbUnderPressure(t0 + 31_000)).toBe(false)
  })

  it("noteDbError only records exhaustion errors", () => {
    expect(noteDbError(new Error("permission denied"))).toBe(false)
    expect(noteDbError({ code: "P2024" })).toBe(true)
    expect(isDbUnderPressure()).toBe(true)
  })
})

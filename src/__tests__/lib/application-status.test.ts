import { describe, it, expect } from "vitest"
import {
  VALID_STATUS_TRANSITIONS,
  canTransitionStatus,
} from "@/lib/application-status"

describe("canTransitionStatus", () => {
  it("allows the documented forward transitions", () => {
    expect(canTransitionStatus("applied", "reviewing")).toBe(true)
    expect(canTransitionStatus("applied", "rejected")).toBe(true)
    expect(canTransitionStatus("reviewing", "interview")).toBe(true)
    expect(canTransitionStatus("interview", "offered")).toBe(true)
    expect(canTransitionStatus("offered", "hired")).toBe(true)
    expect(canTransitionStatus("offered", "rejected")).toBe(true)
  })

  it("rejects skipping steps", () => {
    expect(canTransitionStatus("applied", "hired")).toBe(false)
    expect(canTransitionStatus("applied", "interview")).toBe(false)
    expect(canTransitionStatus("reviewing", "hired")).toBe(false)
  })

  it("rejects reverting from terminal statuses (hired / rejected)", () => {
    expect(canTransitionStatus("hired", "applied")).toBe(false)
    expect(canTransitionStatus("hired", "reviewing")).toBe(false)
    expect(canTransitionStatus("rejected", "applied")).toBe(false)
    expect(canTransitionStatus("rejected", "hired")).toBe(false)
  })

  it("rejects transitions from unknown statuses", () => {
    expect(canTransitionStatus("unknown", "applied")).toBe(false)
  })

  it("every transition target is a valid status reachable exactly per the map", () => {
    for (const [from, targets] of Object.entries(VALID_STATUS_TRANSITIONS)) {
      for (const to of targets) {
        expect(canTransitionStatus(from, to)).toBe(true)
      }
    }
  })
})

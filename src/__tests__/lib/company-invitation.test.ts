import { describe, it, expect } from "vitest"
import {
  generateInvitationToken,
  generateTemporaryPassword,
  INVITATION_EXPIRY_MS,
} from "@/lib/company-invitation"

describe("generateInvitationToken", () => {
  it("returns a 64-character hex string", () => {
    const t = generateInvitationToken()
    expect(t).toMatch(/^[a-f0-9]{64}$/)
  })
  it("returns unique tokens", () => {
    const a = generateInvitationToken()
    const b = generateInvitationToken()
    expect(a).not.toBe(b)
  })
})

describe("generateTemporaryPassword", () => {
  it("returns a 12-character password", () => {
    const p = generateTemporaryPassword()
    expect(p.length).toBe(12)
  })

  it("includes at least one uppercase, lowercase, digit, and symbol", () => {
    for (let i = 0; i < 50; i++) {
      const p = generateTemporaryPassword()
      expect(p, `upper missing in ${p}`).toMatch(/[A-Z]/)
      expect(p, `lower missing in ${p}`).toMatch(/[a-z]/)
      expect(p, `digit missing in ${p}`).toMatch(/\d/)
      expect(p, `symbol missing in ${p}`).toMatch(/[@#$%&*]/)
    }
  })

  it("excludes confusable chars I, l, O, 0, 1", () => {
    for (let i = 0; i < 50; i++) {
      const p = generateTemporaryPassword()
      expect(p).not.toMatch(/[IlO01]/)
    }
  })

  it("produces unique values across many calls", () => {
    const set = new Set<string>()
    for (let i = 0; i < 100; i++) set.add(generateTemporaryPassword())
    // 12 文字、85^12 通り以上 — 100 回で衝突は実質 0
    expect(set.size).toBe(100)
  })
})

describe("INVITATION_EXPIRY_MS", () => {
  it("is 7 days", () => {
    expect(INVITATION_EXPIRY_MS).toBe(7 * 24 * 60 * 60 * 1000)
  })
})

import { describe, it, expect } from "vitest"
import { generateToken, hashToken, TOKEN_EXPIRY_MS } from "@/lib/tokens"

describe("generateToken", () => {
  it("generates a 64-character hex string", () => {
    const token = generateToken()
    expect(token).toMatch(/^[a-f0-9]{64}$/)
  })

  it("generates unique tokens", () => {
    const token1 = generateToken()
    const token2 = generateToken()
    expect(token1).not.toBe(token2)
  })
})

describe("hashToken", () => {
  it("produces a 64-character sha256 hex digest", () => {
    expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/)
  })

  it("is deterministic for the same input", () => {
    const t = generateToken()
    expect(hashToken(t)).toBe(hashToken(t))
  })

  it("differs from the plaintext token (not stored in the clear)", () => {
    const t = generateToken()
    expect(hashToken(t)).not.toBe(t)
  })

  it("matches a known sha256 vector", () => {
    // echo -n "abc" | sha256sum
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })
})

describe("TOKEN_EXPIRY_MS", () => {
  it("is 1 hour in milliseconds", () => {
    expect(TOKEN_EXPIRY_MS).toBe(3600000)
  })
})

import { describe, it, expect, afterEach } from "vitest"
import { isValidCronRequest } from "@/lib/cron-auth"

function requestWithAuth(header: string | null): Request {
  return new Request("https://example.com/api/cron/x", {
    headers: header ? { authorization: header } : {},
  })
}

describe("isValidCronRequest", () => {
  const original = process.env.CRON_SECRET

  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })

  it("fails closed when CRON_SECRET is unset, even with no auth header", () => {
    delete process.env.CRON_SECRET
    expect(isValidCronRequest(requestWithAuth(null))).toBe(false)
  })

  it("fails closed when CRON_SECRET is unset, regardless of what the caller sends", () => {
    delete process.env.CRON_SECRET
    expect(isValidCronRequest(requestWithAuth("Bearer anything"))).toBe(false)
  })

  it("rejects when the header doesn't match the configured secret", () => {
    process.env.CRON_SECRET = "correct-secret"
    expect(isValidCronRequest(requestWithAuth("Bearer wrong-secret"))).toBe(false)
    expect(isValidCronRequest(requestWithAuth(null))).toBe(false)
  })

  it("accepts a matching Bearer token", () => {
    process.env.CRON_SECRET = "correct-secret"
    expect(isValidCronRequest(requestWithAuth("Bearer correct-secret"))).toBe(true)
  })
})

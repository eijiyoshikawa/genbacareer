import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { isCronAuthorized } from "@/lib/cron-auth"

function mockRequest(authHeader: string | null): Request {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "authorization" ? authHeader : null,
    },
  } as unknown as Request
}

describe("isCronAuthorized", () => {
  const originalSecret = process.env.CRON_SECRET

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
  })

  it("rejects when CRON_SECRET is unset, even with no Authorization header (fail-closed)", () => {
    delete process.env.CRON_SECRET
    expect(isCronAuthorized(mockRequest(null))).toBe(false)
  })

  it("rejects when CRON_SECRET is unset, even if Authorization header is 'Bearer undefined'", () => {
    delete process.env.CRON_SECRET
    expect(isCronAuthorized(mockRequest("Bearer undefined"))).toBe(false)
  })

  it("rejects when CRON_SECRET is empty string", () => {
    process.env.CRON_SECRET = ""
    expect(isCronAuthorized(mockRequest("Bearer "))).toBe(false)
  })

  describe("with CRON_SECRET set", () => {
    beforeEach(() => {
      process.env.CRON_SECRET = "test-secret-value"
    })

    it("accepts a matching Bearer token", () => {
      expect(isCronAuthorized(mockRequest("Bearer test-secret-value"))).toBe(true)
    })

    it("rejects a mismatched token", () => {
      expect(isCronAuthorized(mockRequest("Bearer wrong-value"))).toBe(false)
    })

    it("rejects a missing Authorization header", () => {
      expect(isCronAuthorized(mockRequest(null))).toBe(false)
    })
  })
})

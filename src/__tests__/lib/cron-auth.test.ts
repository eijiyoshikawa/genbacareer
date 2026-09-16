import { describe, it, expect, afterEach } from "vitest"
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
  const originalEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process.env as any).NODE_ENV = originalEnv
  })

  it("accepts a matching Bearer token", () => {
    process.env.CRON_SECRET = "s3cret"
    expect(isCronAuthorized(mockRequest("Bearer s3cret"))).toBe(true)
  })

  it("rejects a mismatched Bearer token", () => {
    process.env.CRON_SECRET = "s3cret"
    expect(isCronAuthorized(mockRequest("Bearer wrong"))).toBe(false)
  })

  it("rejects a missing Authorization header when a secret is configured", () => {
    process.env.CRON_SECRET = "s3cret"
    expect(isCronAuthorized(mockRequest(null))).toBe(false)
  })

  it("fails CLOSED (rejects) when CRON_SECRET is unset in production", () => {
    delete process.env.CRON_SECRET
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process.env as any).NODE_ENV = "production"
    expect(isCronAuthorized(mockRequest(null))).toBe(false)
    expect(isCronAuthorized(mockRequest("Bearer anything"))).toBe(false)
  })

  it("fails open (allows) when CRON_SECRET is unset outside production", () => {
    delete process.env.CRON_SECRET
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(process.env as any).NODE_ENV = "development"
    expect(isCronAuthorized(mockRequest(null))).toBe(true)
  })
})

import { describe, it, expect, vi, afterEach } from "vitest"
import { isCronAuthorized } from "@/lib/cron-auth"

function makeRequest(authHeader?: string): Request {
  return new Request("https://example.com/api/cron/x", {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

describe("isCronAuthorized", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("allows a request with the correct Bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t")
    expect(isCronAuthorized(makeRequest("Bearer s3cr3t"))).toBe(true)
  })

  it("rejects a request with a wrong or missing Authorization header", () => {
    vi.stubEnv("CRON_SECRET", "s3cr3t")
    expect(isCronAuthorized(makeRequest("Bearer wrong"))).toBe(false)
    expect(isCronAuthorized(makeRequest())).toBe(false)
  })

  it("fails CLOSED in production when CRON_SECRET is unset (misconfiguration must not open the endpoint)", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(isCronAuthorized(makeRequest())).toBe(false)
    expect(isCronAuthorized(makeRequest("Bearer anything"))).toBe(false)
  })

  it("fails OPEN outside production when CRON_SECRET is unset (local dev convenience)", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "test")
    expect(isCronAuthorized(makeRequest())).toBe(true)
  })
})

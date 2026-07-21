import { describe, it, expect, afterEach, vi } from "vitest"
import { NextRequest } from "next/server"
import { middleware } from "@/middleware"

/**
 * /admin/* だけでなく /api/admin/* も IP allowlist の対象になっていることを
 * 確認する回帰テスト。以前は adminRoutes = ["/admin"] のみで判定していたため
 * /api/admin/* は allowlist を素通りしていた (画面を経由しない直叩きが可能だった)。
 */
describe("middleware admin IP allowlist", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function makeRequest(pathname: string, clientIp: string) {
    return new NextRequest(`https://www.genbacareer.jp${pathname}`, {
      headers: {
        "user-agent": "Mozilla/5.0 (Test)",
        "x-forwarded-for": clientIp,
      },
    })
  }

  it("blocks /api/admin/* from a non-allowlisted IP", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_IP_ALLOWLIST", "203.0.113.1")

    const res = middleware(makeRequest("/api/admin/companies", "198.51.100.1"))
    expect(res.status).toBe(403)
  })

  it("allows /api/admin/* from an allowlisted IP", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("ADMIN_IP_ALLOWLIST", "203.0.113.1")

    const res = middleware(makeRequest("/api/admin/companies", "203.0.113.1"))
    expect(res.status).not.toBe(403)
  })

  it("does not affect /api/admin/* when ADMIN_IP_ALLOWLIST is unset", () => {
    vi.stubEnv("ADMIN_IP_ALLOWLIST", "")
    const res = middleware(makeRequest("/api/admin/companies", "198.51.100.1"))
    expect(res.status).not.toBe(403)
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { verifyCronAuth } from "@/lib/cron-auth"

function req(auth?: string) {
  return new Request("https://example.com/api/cron/x", {
    headers: auth ? { authorization: auth } : {},
  })
}

describe("verifyCronAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("CRON_SECRET 設定時: 正しい Bearer なら通す", () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    expect(verifyCronAuth(req("Bearer s3cret"))).toBeNull()
  })

  it("CRON_SECRET 設定時: 不一致 / ヘッダなしは 401", () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    expect(verifyCronAuth(req("Bearer wrong"))?.status).toBe(401)
    expect(verifyCronAuth(req())?.status).toBe(401)
  })

  it("CRON_SECRET 未設定 + production は fail-closed (503)", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "production")
    vi.spyOn(console, "error").mockImplementation(() => {})
    expect(verifyCronAuth(req())?.status).toBe(503)
  })

  it("CRON_SECRET 未設定 + 非 production は素通し", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "development")
    expect(verifyCronAuth(req())).toBeNull()
  })
})

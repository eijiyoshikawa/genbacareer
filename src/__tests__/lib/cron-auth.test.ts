import { afterEach, describe, expect, it, vi } from "vitest"
import { isCronAuthorized } from "@/lib/cron-auth"

describe("isCronAuthorized", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("secret 設定済み: 正しい Bearer のみ許可", () => {
    vi.stubEnv("CRON_SECRET", "s3cret")
    vi.stubEnv("NODE_ENV", "production")
    expect(isCronAuthorized("Bearer s3cret")).toBe(true)
    expect(isCronAuthorized("Bearer wrong")).toBe(false)
    expect(isCronAuthorized(null)).toBe(false)
  })

  it("secret 未設定: 本番は拒否 (fail-closed)", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(isCronAuthorized(null)).toBe(false)
  })

  it("secret 未設定: 開発は許可", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "development")
    expect(isCronAuthorized(null)).toBe(true)
  })
})

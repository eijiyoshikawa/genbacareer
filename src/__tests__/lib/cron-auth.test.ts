import { afterEach, describe, expect, it, vi } from "vitest"
import { isCronAuthorized } from "@/lib/cron-auth"

const req = (auth?: string) =>
  new Request("http://x/api/cron/a", { headers: auth ? { authorization: auth } : {} })

describe("isCronAuthorized", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("secret あり: 一致のみ許可", () => {
    vi.stubEnv("CRON_SECRET", "s3")
    expect(isCronAuthorized(req("Bearer s3"))).toBe(true)
    expect(isCronAuthorized(req("Bearer bad"))).toBe(false)
    expect(isCronAuthorized(req())).toBe(false)
  })
  it("secret なし + production: 拒否", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "production")
    expect(isCronAuthorized(req())).toBe(false)
  })
  it("secret なし + 開発: 許可", () => {
    vi.stubEnv("CRON_SECRET", "")
    vi.stubEnv("NODE_ENV", "development")
    expect(isCronAuthorized(req())).toBe(true)
  })
})

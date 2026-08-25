import { describe, it, expect, vi, afterEach } from "vitest"
import { isAuthorizedCronRequest } from "@/lib/cron-auth"

/**
 * cron / 内部エンドポイントの認証ヘルパー。
 *
 * CRON_SECRET が未設定のまま本番にデプロイされても fail-open (誰でも
 * 実行可能) にならないことを保証する。開発 / プレビューでは従来通り
 * CRON_SECRET なしでも動作確認できる。
 */
describe("isAuthorizedCronRequest", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  function makeRequest(authHeader?: string): Request {
    return new Request("https://example.com/api/cron/x", {
      headers: authHeader ? { authorization: authHeader } : {},
    })
  }

  it("rejects in production when CRON_SECRET is unset (no fail-open)", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CRON_SECRET", "")
    expect(isAuthorizedCronRequest(makeRequest())).toBe(false)
    expect(isAuthorizedCronRequest(makeRequest("Bearer anything"))).toBe(false)
  })

  it("allows in non-production when CRON_SECRET is unset (dev convenience)", () => {
    vi.stubEnv("NODE_ENV", "test")
    vi.stubEnv("CRON_SECRET", "")
    expect(isAuthorizedCronRequest(makeRequest())).toBe(true)
  })

  it("requires exact Bearer match when CRON_SECRET is set", () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("CRON_SECRET", "s3cr3t")
    expect(isAuthorizedCronRequest(makeRequest("Bearer s3cr3t"))).toBe(true)
    expect(isAuthorizedCronRequest(makeRequest("Bearer wrong"))).toBe(false)
    expect(isAuthorizedCronRequest(makeRequest())).toBe(false)
  })
})

import { afterEach, describe, expect, it, vi } from "vitest"
import { isCronAuthorized } from "./cron-auth"

describe("isCronAuthorized", () => {
  afterEach(() => vi.unstubAllEnvs())

  it("accepts matching bearer token", () => {
    expect(isCronAuthorized("s3cret", "Bearer s3cret")).toBe(true)
  })
  it("rejects wrong or missing header when secret set", () => {
    expect(isCronAuthorized("s3cret", "Bearer x")).toBe(false)
    expect(isCronAuthorized("s3cret", null)).toBe(false)
  })
  it("fails closed in production without secret", () => {
    vi.stubEnv("NODE_ENV", "production")
    expect(isCronAuthorized(undefined, null)).toBe(false)
  })
  it("allows without secret outside production", () => {
    vi.stubEnv("NODE_ENV", "development")
    expect(isCronAuthorized(undefined, null)).toBe(true)
  })
})

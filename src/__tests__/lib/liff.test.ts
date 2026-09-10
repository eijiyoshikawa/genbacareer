import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  process.env.LIFF_CHANNEL_ID = "test-channel-id"
})

afterEach(() => {
  delete process.env.LIFF_CHANNEL_ID
  delete process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID
})

function mockFetchSequence(responses: Array<{ ok: boolean; json: unknown }>) {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      json: async () => r.json,
    } as Response)
  }
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("verifyLiffAccessToken", () => {
  it("rejects empty token without calling LINE", async () => {
    const fetchMock = mockFetchSequence([])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("")
    expect(result).toEqual({ ok: false, reason: "empty_token" })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("rejects when client_id does not match the configured channel", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "someone-elses-channel", expires_in: 1000 } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("tok")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("client_id_mismatch")
  })

  it("rejects an expired token", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "test-channel-id", expires_in: 0 } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("tok")
    expect(result).toEqual({ ok: false, reason: "expired" })
  })

  it("without expectedUserId, does not check token ownership", async () => {
    const fetchMock = mockFetchSequence([
      { ok: true, json: { client_id: "test-channel-id", expires_in: 1000 } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("tok")
    expect(result.ok).toBe(true)
    // verify エンドポイントのみ呼ばれ、profile は呼ばれない
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("accepts when the token's real owner matches the claimed lineUserId", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "test-channel-id", expires_in: 1000 } },
      { ok: true, json: { userId: "U_victim_or_self" } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("tok", "U_victim_or_self")
    expect(result.ok).toBe(true)
    expect(result.userId).toBe("U_victim_or_self")
  })

  it("rejects when a valid token is replayed with someone else's lineUserId (spoofing)", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "test-channel-id", expires_in: 1000 } },
      { ok: true, json: { userId: "U_attacker_self" } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("tok", "U_victim")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("user_id_mismatch")
  })

  it("rejects when the profile lookup itself fails", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "test-channel-id", expires_in: 1000 } },
      { ok: false, json: {} },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("tok", "U_victim")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("user_id_mismatch")
  })
})

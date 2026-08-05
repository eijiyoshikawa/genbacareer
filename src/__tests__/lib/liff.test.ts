import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"

/**
 * verifyLiffAccessToken の検証:
 * - トークンが有効な channel 発行かを確認するだけでなく、
 *   トークンの持ち主の実 userId を /v2/profile から取得して返すこと
 *   (呼び出し側がクライアント申告の lineUserId をそのまま信用してなりすまし
 *   を許してしまう回帰を防ぐ)
 */

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  process.env.LIFF_CHANNEL_ID = "expected-channel-id"
})

afterEach(() => {
  delete process.env.LIFF_CHANNEL_ID
})

function mockFetchSequence(responses: Array<{ ok: boolean; status?: number; json?: unknown }>) {
  const fn = vi.fn()
  for (const r of responses) {
    fn.mockResolvedValueOnce({
      ok: r.ok,
      status: r.status ?? (r.ok ? 200 : 400),
      json: async () => r.json ?? {},
    })
  }
  vi.stubGlobal("fetch", fn)
  return fn
}

describe("verifyLiffAccessToken", () => {
  it("空トークンは即座に拒否する", async () => {
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("empty_token")
  })

  it("成功時は /v2/profile から取得した userId を返す（クライアント申告値ではない）", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "expected-channel-id", expires_in: 1000 } },
      { ok: true, json: { userId: "U_real_owner_of_token" } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("valid-token")
    expect(result.ok).toBe(true)
    expect(result.userId).toBe("U_real_owner_of_token")
  })

  it("client_id が一致しないトークンは拒否する", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "someone-elses-channel", expires_in: 1000 } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("client_id_mismatch")
  })

  it("期限切れトークンは拒否する", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "expected-channel-id", expires_in: 0 } },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("expired")
  })

  it("/v2/profile 取得に失敗したら拒否する（userId を確定できないため）", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "expected-channel-id", expires_in: 1000 } },
      { ok: false, status: 401 },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("profile_http_401")
  })

  it("/v2/profile が userId を含まない場合は拒否する", async () => {
    mockFetchSequence([
      { ok: true, json: { client_id: "expected-channel-id", expires_in: 1000 } },
      { ok: true, json: {} },
    ])
    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token")
    expect(result.ok).toBe(false)
    expect(result.reason).toBe("profile_no_user_id")
  })
})

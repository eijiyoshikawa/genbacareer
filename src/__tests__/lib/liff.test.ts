import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
})

afterEach(() => {
  delete process.env.LIFF_CHANNEL_ID
  delete process.env.NEXT_PUBLIC_LIFF_CHANNEL_ID
})

/**
 * LINE の oauth2/v2.1/verify はトークンの有効性しか保証せず、持ち主の userId は
 * 返さない。verify が通っただけで trust すると、任意の有効な LIFF トークンを持つ
 * 攻撃者がクライアント側の lineUserId フィールドを偽装して別人になりすませてしまう
 * (定期バグ検査で発見)。v2/profile を追加で叩き、トークンに実際に紐づく userId を
 * 返すことでこれを防ぐ。
 */
describe("verifyLiffAccessToken", () => {
  it("returns the verified userId from v2/profile on success", async () => {
    process.env.LIFF_CHANNEL_ID = "channel-123"
    const fetchMock = vi.fn(async (url: string) => {
      if (url.startsWith("https://api.line.me/oauth2/v2.1/verify")) {
        return {
          ok: true,
          json: async () => ({ client_id: "channel-123", expires_in: 1000 }),
        } as Response
      }
      if (url.startsWith("https://api.line.me/v2/profile")) {
        return {
          ok: true,
          json: async () => ({ userId: "U_real_owner" }),
        } as Response
      }
      throw new Error(`unexpected url: ${url}`)
    })
    vi.stubGlobal("fetch", fetchMock)

    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token-abc")

    expect(result).toEqual({
      ok: true,
      clientId: "channel-123",
      expiresIn: 1000,
      userId: "U_real_owner",
    })
  })

  it("fails closed when v2/profile does not return a userId", async () => {
    process.env.LIFF_CHANNEL_ID = "channel-123"
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("https://api.line.me/oauth2/v2.1/verify")) {
          return {
            ok: true,
            json: async () => ({ client_id: "channel-123", expires_in: 1000 }),
          } as Response
        }
        return { ok: true, json: async () => ({}) } as Response
      })
    )

    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token-abc")

    expect(result.ok).toBe(false)
    expect(result.reason).toBe("profile_missing_user_id")
  })

  it("fails closed when v2/profile request itself errors", async () => {
    process.env.LIFF_CHANNEL_ID = "channel-123"
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.startsWith("https://api.line.me/oauth2/v2.1/verify")) {
          return {
            ok: true,
            json: async () => ({ client_id: "channel-123", expires_in: 1000 }),
          } as Response
        }
        return { ok: false, status: 401 } as Response
      })
    )

    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token-abc")

    expect(result.ok).toBe(false)
    expect(result.reason).toBe("profile_http_401")
  })

  it("still rejects mismatched client_id before ever calling v2/profile", async () => {
    process.env.LIFF_CHANNEL_ID = "channel-123"
    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({ client_id: "someone-elses-channel", expires_in: 1000 }),
    })) as unknown as typeof fetch
    vi.stubGlobal("fetch", fetchMock)

    const { verifyLiffAccessToken } = await import("../../lib/liff")
    const result = await verifyLiffAccessToken("token-abc")

    expect(result).toEqual({
      ok: false,
      reason: "client_id_mismatch",
      clientId: "someone-elses-channel",
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

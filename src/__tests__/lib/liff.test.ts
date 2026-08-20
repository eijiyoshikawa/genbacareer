import { describe, it, expect, vi, afterEach } from "vitest"
import { fetchLiffUserId } from "@/lib/liff"

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  vi.restoreAllMocks()
})

function mockFetch(impl: (url: string, init?: RequestInit) => unknown) {
  const spy = vi.fn((url: string, init?: RequestInit) => impl(url, init))
  globalThis.fetch = spy as unknown as typeof fetch
  return spy
}

describe("fetchLiffUserId", () => {
  it("returns the userId reported by LINE, not anything the caller supplies", async () => {
    mockFetch(() => ({
      ok: true,
      json: async () => ({ userId: "U_real", displayName: "本人" }),
    }))
    await expect(fetchLiffUserId("token")).resolves.toBe("U_real")
  })

  it("sends the access token as a bearer credential", async () => {
    const spy = mockFetch(() => ({ ok: true, json: async () => ({ userId: "U1" }) }))
    await fetchLiffUserId("tok123")
    const [url, init] = spy.mock.calls[0]
    expect(url).toBe("https://api.line.me/v2/profile")
    expect(
      (init?.headers as Record<string, string> | undefined)?.Authorization
    ).toBe("Bearer tok123")
  })

  // 失敗時に null を返すことが重要。呼び出し側はこれを見て
  // 「LINE 紐付けなし」で保存する。未認証の ID を保存させない。
  it("returns null when LINE rejects the token", async () => {
    mockFetch(() => ({ ok: false, status: 401, json: async () => ({}) }))
    await expect(fetchLiffUserId("bad")).resolves.toBeNull()
  })

  it("returns null when the response carries no userId", async () => {
    mockFetch(() => ({ ok: true, json: async () => ({ displayName: "x" }) }))
    await expect(fetchLiffUserId("token")).resolves.toBeNull()
  })

  it("returns null when userId is not a string", async () => {
    mockFetch(() => ({ ok: true, json: async () => ({ userId: 12345 }) }))
    await expect(fetchLiffUserId("token")).resolves.toBeNull()
  })

  it("returns null on a network error instead of throwing", async () => {
    mockFetch(() => {
      throw new Error("network down")
    })
    await expect(fetchLiffUserId("token")).resolves.toBeNull()
  })

  it("returns null for an empty token without calling LINE", async () => {
    const spy = mockFetch(() => ({ ok: true, json: async () => ({ userId: "U" }) }))
    await expect(fetchLiffUserId("")).resolves.toBeNull()
    expect(spy).not.toHaveBeenCalled()
  })
})

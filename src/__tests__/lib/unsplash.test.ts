import { describe, it, expect, beforeEach, vi, afterEach } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
})

afterEach(() => {
  delete process.env.UNSPLASH_ACCESS_KEY
})

describe("isUnsplashConfigured", () => {
  it("UNSPLASH_ACCESS_KEY 未設定で false", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY
    const { isUnsplashConfigured } = await import("../../lib/unsplash")
    expect(isUnsplashConfigured()).toBe(false)
  })

  it("UNSPLASH_ACCESS_KEY 設定済で true", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key"
    const { isUnsplashConfigured } = await import("../../lib/unsplash")
    expect(isUnsplashConfigured()).toBe(true)
  })
})

describe("searchUnsplashPhotos", () => {
  it("空クエリで早期 return", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key"
    const { searchUnsplashPhotos } = await import("../../lib/unsplash")
    const result = await searchUnsplashPhotos("")
    expect(result).toEqual({ total: 0, totalPages: 0, results: [] })
    expect(await searchUnsplashPhotos("   ")).toEqual({ total: 0, totalPages: 0, results: [] })
  })

  it("API キー未設定で throw", async () => {
    delete process.env.UNSPLASH_ACCESS_KEY
    const { searchUnsplashPhotos } = await import("../../lib/unsplash")
    await expect(searchUnsplashPhotos("construction")).rejects.toThrow(/UNSPLASH_ACCESS_KEY/)
  })

  it("レスポンスを正規化する", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key"
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        total: 100,
        total_pages: 6,
        results: [
          {
            id: "abc123",
            description: "Construction site",
            alt_description: null,
            urls: {
              raw: "https://images.unsplash.com/photo-1?raw",
              full: "https://images.unsplash.com/photo-1?full",
              regular: "https://images.unsplash.com/photo-1?regular",
              small: "https://images.unsplash.com/photo-1?small",
              thumb: "https://images.unsplash.com/photo-1?thumb",
            },
            user: {
              name: "Taro Test",
              username: "tarotest",
              links: { html: "https://unsplash.com/@tarotest" },
            },
            links: { html: "https://unsplash.com/photos/abc123" },
            width: 1920,
            height: 1080,
            color: "#ffaa00",
          },
        ],
      }),
    } as Response)
    vi.stubGlobal("fetch", mockFetch)
    const { searchUnsplashPhotos } = await import("../../lib/unsplash")
    const result = await searchUnsplashPhotos("建設 現場", { orientation: "landscape" })
    expect(result.total).toBe(100)
    expect(result.totalPages).toBe(6)
    expect(result.results).toHaveLength(1)
    expect(result.results[0]).toMatchObject({
      id: "abc123",
      description: "Construction site",
      user: { name: "Taro Test", username: "tarotest" },
      htmlUrl: "https://unsplash.com/photos/abc123",
    })
    expect(result.results[0].urls.regular).toBe("https://images.unsplash.com/photo-1?regular")
    expect(mockFetch).toHaveBeenCalledOnce()
    const calledUrl = String(mockFetch.mock.calls[0][0])
    expect(calledUrl).toContain("query=%E5%BB%BA%E8%A8%AD")
    expect(calledUrl).toContain("orientation=landscape")
  })

  it("alt_description にフォールバック", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          total: 1,
          total_pages: 1,
          results: [
            {
              id: "x",
              description: null,
              alt_description: "fallback alt",
              urls: { raw: "u", full: "u", regular: "u", small: "u", thumb: "u" },
              user: { name: "U", username: "u" },
              links: {},
              width: 100,
              height: 100,
              color: null,
            },
          ],
        }),
      } as Response)
    )
    const { searchUnsplashPhotos } = await import("../../lib/unsplash")
    const result = await searchUnsplashPhotos("x")
    expect(result.results[0].description).toBe("fallback alt")
    expect(result.results[0].user.profileUrl).toBe("https://unsplash.com/@u")
    expect(result.results[0].htmlUrl).toBe("https://unsplash.com/photos/x")
  })

  it("API エラー時に throw", async () => {
    process.env.UNSPLASH_ACCESS_KEY = "test-key"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => "Unauthorized",
      } as Response)
    )
    const { searchUnsplashPhotos } = await import("../../lib/unsplash")
    await expect(searchUnsplashPhotos("construction")).rejects.toThrow(/401/)
  })
})

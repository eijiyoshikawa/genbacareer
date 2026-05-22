import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  fetchKyujinByDataId,
  splitPrefectureCity,
} from "@/lib/crawler/hellowork"

describe("splitPrefectureCity", () => {
  it("extracts prefecture from standard prefix", () => {
    expect(splitPrefectureCity("東京都千代田区丸の内1-1-1")).toEqual({
      prefecture: "東京都",
      city: "千代田区丸の内1-1-1",
    })
    expect(splitPrefectureCity("北海道札幌市中央区")).toEqual({
      prefecture: "北海道",
      city: "札幌市中央区",
    })
    expect(splitPrefectureCity("大阪府大阪市北区")).toEqual({
      prefecture: "大阪府",
      city: "大阪市北区",
    })
    expect(splitPrefectureCity("京都府京都市左京区")).toEqual({
      prefecture: "京都府",
      city: "京都市左京区",
    })
  })

  it("recovers from leading postal code or whitespace", () => {
    expect(
      splitPrefectureCity("〒100-0001 東京都千代田区丸の内")
    ).toEqual({ prefecture: "東京都", city: "千代田区丸の内" })
    expect(splitPrefectureCity(" 　大阪府大阪市中央区")).toEqual({
      prefecture: "大阪府",
      city: "大阪市中央区",
    })
  })

  it("falls back to '不明' when no prefecture can be found", () => {
    const r = splitPrefectureCity("ABC company HQ, Building 5F")
    expect(r.prefecture).toBe("不明")
    expect(r.city).toBe("ABC company HQ, Building 5F")
  })

  it("treats null/empty input as '不明'", () => {
    expect(splitPrefectureCity(null)).toEqual({
      prefecture: "不明",
      city: null,
    })
    expect(splitPrefectureCity("")).toEqual({
      prefecture: "不明",
      city: null,
    })
  })

  it("never produces prefecture longer than 4 chars (DB VarChar(20) safe)", () => {
    const long = "X".repeat(500)
    const r = splitPrefectureCity(long)
    expect(r.prefecture.length).toBeLessThanOrEqual(4) // 神奈川県 = 4 chars max
    // city は 100 字まで切られる
    expect((r.city ?? "").length).toBeLessThanOrEqual(100)
  })

  it("trims whitespace around city", () => {
    expect(splitPrefectureCity("東京都 千代田区  ")).toEqual({
      prefecture: "東京都",
      city: "千代田区",
    })
  })
})

describe("fetchKyujinByDataId", () => {
  const realFetch = globalThis.fetch
  const realEnv = { user: process.env.HELLOWORK_API_USER, pass: process.env.HELLOWORK_API_PASS }

  beforeEach(() => {
    process.env.HELLOWORK_API_USER = "test-user"
    process.env.HELLOWORK_API_PASS = "test-pass"
  })

  afterEach(() => {
    globalThis.fetch = realFetch
    process.env.HELLOWORK_API_USER = realEnv.user
    process.env.HELLOWORK_API_PASS = realEnv.pass
    vi.restoreAllMocks()
  })

  it("returns [] when API responds 404 (page out of range)", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("Not Found", {
          status: 404,
          statusText: "Not Found",
        })
    ) as typeof fetch

    const jobs = await fetchKyujinByDataId("dummy-token", "M105", 5)
    expect(jobs).toEqual([])
  })

  it("re-throws on non-404 errors (e.g. 500)", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        })
    ) as typeof fetch

    await expect(
      fetchKyujinByDataId("dummy-token", "M100", 1)
    ).rejects.toThrow(/500/)
  })
})

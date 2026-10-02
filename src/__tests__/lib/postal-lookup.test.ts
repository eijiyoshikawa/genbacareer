import { describe, it, expect, vi, afterEach } from "vitest"
import { normalizeZip, lookupAddressByZip } from "@/lib/postal-lookup"

describe("normalizeZip", () => {
  it("ハイフンや空白を除去して 7 桁を取り出す", () => {
    expect(normalizeZip("100-0001")).toBe("1000001")
    expect(normalizeZip("〒100-0001")).toBe("1000001")
    expect(normalizeZip(" 100 0001 ")).toBe("1000001")
  })

  it("全角数字を半角に変換する", () => {
    expect(normalizeZip("１００−０００１")).toBe("1000001")
  })

  it("数字以外しか無ければ空文字", () => {
    expect(normalizeZip("abc")).toBe("")
  })
})

describe("lookupAddressByZip", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("7 桁でなければ fetch せず null", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")
    expect(await lookupAddressByZip("123")).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it("zipcloud の結果を prefecture/city/town に整形する", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          status: 200,
          message: null,
          results: [
            {
              address1: "東京都",
              address2: "千代田区",
              address3: "千代田",
            },
          ],
        })
      )
    )
    expect(await lookupAddressByZip("100-0001")).toEqual({
      prefecture: "東京都",
      city: "千代田区",
      town: "千代田",
    })
  })

  it("結果が空なら null", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ status: 200, message: null, results: null })
      )
    )
    expect(await lookupAddressByZip("9999999")).toBeNull()
  })

  it("通信エラーは握りつぶして null", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"))
    expect(await lookupAddressByZip("1000001")).toBeNull()
  })
})

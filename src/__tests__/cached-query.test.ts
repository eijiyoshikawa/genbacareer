import { describe, it, expect, vi } from "vitest"
import { cachedQuery } from "@/lib/cached-query"

// vitest には Next.js の Data Cache が無いので、フォールバック経路を検証する。
describe("cachedQuery (Data Cache が無い実行環境)", () => {
  it("キャッシュ無しでクエリを実行して結果を返す", async () => {
    const fn = vi.fn().mockResolvedValue(["a", "b"])
    await expect(cachedQuery(["k"], 60, fn)).resolves.toEqual(["a", "b"])
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("クエリ自体の失敗はそのまま伝え、二重実行しない", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("db down"))
    await expect(cachedQuery(["k"], 60, fn)).rejects.toThrow("db down")
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

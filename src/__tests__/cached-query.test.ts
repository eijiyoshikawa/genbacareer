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

describe("cachedQuery (同時実行の抑制)", () => {
  it("同じキーの同時リクエストは 1 回の実行を共有する", async () => {
    let release!: (v: string) => void
    const fn = vi.fn(
      () => new Promise<string>((resolve) => (release = resolve))
    )
    const a = cachedQuery(["same"], 60, fn)
    const b = cachedQuery(["same"], 60, fn)
    await vi.waitFor(() => expect(fn).toHaveBeenCalledTimes(1))
    release("ok")
    await expect(Promise.all([a, b])).resolves.toEqual(["ok", "ok"])
    expect(fn).toHaveBeenCalledTimes(1)

    // 完了後は共有しない (次のリクエストは改めて実行する)
    const again = vi.fn().mockResolvedValue("next")
    await expect(cachedQuery(["same"], 60, again)).resolves.toBe("next")
  })

  it("キーが違うクエリは同時に 3 本までしか走らせない", async () => {
    let active = 0
    let peak = 0
    const releases: Array<() => void> = []
    const make = () => async () => {
      active++
      peak = Math.max(peak, active)
      await new Promise<void>((resolve) => releases.push(resolve))
      active--
      return "done"
    }
    const all = Array.from({ length: 8 }, (_, i) =>
      cachedQuery([`k${i}`], 60, make())
    )
    for (let done = 0; done < 8; done++) {
      await vi.waitFor(() => expect(releases.length).toBeGreaterThan(0))
      expect(active).toBeLessThanOrEqual(3)
      releases.shift()!()
    }
    await expect(Promise.all(all)).resolves.toHaveLength(8)
    expect(peak).toBe(3)
  })

  it("失敗しても枠を返す", async () => {
    for (let i = 0; i < 5; i++) {
      await expect(
        cachedQuery([`fail${i}`], 60, () => Promise.reject(new Error("x")))
      ).rejects.toThrow("x")
    }
    await expect(cachedQuery(["after"], 60, async () => 1)).resolves.toBe(1)
  })
})

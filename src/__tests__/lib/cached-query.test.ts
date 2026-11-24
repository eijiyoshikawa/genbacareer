import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Data Cache は素通し (毎回ミス扱い) にして、同時実行の制御だけを確かめる
vi.mock("next/cache", () => ({
  unstable_cache:
    <T,>(fn: () => Promise<T>) =>
    () =>
      fn(),
}))

type Deferred = { promise: Promise<string>; resolve: (v: string) => void }
function deferred(): Deferred {
  let resolve!: (v: string) => void
  const promise = new Promise<string>((r) => {
    resolve = r
  })
  return { promise, resolve }
}

describe("cachedQuery", () => {
  beforeEach(() => {
    vi.resetModules()
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("shares one execution between concurrent calls with the same key", async () => {
    const { cachedQuery } = await import("@/lib/cached-query")
    const d = deferred()
    const fn = vi.fn(() => d.promise)
    const a = cachedQuery(["k"], 60, fn)
    const b = cachedQuery(["k"], 60, fn)
    d.resolve("ok")
    expect(await a).toBe("ok")
    expect(await b).toBe("ok")
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("runs at most 3 misses at once and hands the slot to the next waiter", async () => {
    const { cachedQuery } = await import("@/lib/cached-query")
    const ds = [deferred(), deferred(), deferred(), deferred()]
    const fns = ds.map((d) => vi.fn(() => d.promise))
    const results = fns.map((fn, i) => cachedQuery([`k${i}`], 60, fn))
    await vi.advanceTimersByTimeAsync(0)
    expect(fns.map((f) => f.mock.calls.length)).toEqual([1, 1, 1, 0])

    ds[0].resolve("a")
    await vi.advanceTimersByTimeAsync(0)
    expect(fns[3]).toHaveBeenCalledTimes(1)

    ds[1].resolve("b")
    ds[2].resolve("c")
    ds[3].resolve("d")
    expect(await Promise.all(results)).toEqual(["a", "b", "c", "d"])
  })

  it("gives up instead of waiting forever when every slot is stuck", async () => {
    const { cachedQuery, CachedQueryBusyError } = await import("@/lib/cached-query")
    const stuck = [deferred(), deferred(), deferred()]
    const holders = stuck.map((d, i) => cachedQuery([`stuck${i}`], 60, () => d.promise))
    await vi.advanceTimersByTimeAsync(0)

    const fn = vi.fn(async () => "never")
    const waiting = cachedQuery(["waiting"], 60, fn)
    const outcome = waiting.then(
      () => "resolved",
      (e: unknown) => e
    )
    await vi.advanceTimersByTimeAsync(15_000)
    expect(await outcome).toBeInstanceOf(CachedQueryBusyError)
    expect(fn).not.toHaveBeenCalled()

    // 諦めた待機者は列から抜けている: 枠が空いたあとは通常どおり実行できる
    stuck.forEach((d) => d.resolve("done"))
    await Promise.all(holders)
    const later = vi.fn(async () => "later")
    expect(await cachedQuery(["later"], 60, later)).toBe("later")
    expect(later).toHaveBeenCalledTimes(1)
  })
})

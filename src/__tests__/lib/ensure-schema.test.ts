import { describe, it, expect, vi, beforeEach } from "vitest"

const executeRawUnsafe = vi.fn()

// 接続枯渇の観測状態 (本物は db.ts が時刻で管理する。テストでは手で切り替える)
let underPressure = false

vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRawUnsafe: (...args: unknown[]) => executeRawUnsafe(...args),
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
  isDbUnderPressure: () => underPressure,
  noteDbError: (e: unknown) => {
    const hit = /P2024|ECHECKOUT|Timed out fetching a new connection/.test(
      e instanceof Error ? e.message : String(e)
    )
    if (hit) underPressure = true
    return hit
  },
}))

describe("ensureSchema", () => {
  beforeEach(() => {
    executeRawUnsafe.mockReset()
    underPressure = false
    vi.resetModules()
  })

  it("caches a fully successful run so later calls do not re-hit the DB", async () => {
    executeRawUnsafe.mockResolvedValue(undefined)
    const { ensureSchema } = await import("@/lib/ensure-schema")

    expect(await ensureSchema()).toBe(true)
    const callsAfterFirst = executeRawUnsafe.mock.calls.length
    expect(callsAfterFirst).toBeGreaterThan(0)

    expect(await ensureSchema()).toBe(true)
    expect(executeRawUnsafe.mock.calls.length).toBe(callsAfterFirst)
  })

  it("does not cache a run that failed on a DB connection-pool timeout, so it retries next call", async () => {
    executeRawUnsafe.mockRejectedValueOnce(
      new Error(
        "Timed out fetching a new connection from the connection pool. More info: http://pris.ly/d/connection-pool (Current connection pool timeout: 30, connection limit: 10)"
      )
    )
    executeRawUnsafe.mockResolvedValue(undefined)
    const { ensureSchema } = await import("@/lib/ensure-schema")

    expect(await ensureSchema()).toBe(false)
    const callsAfterFirst = executeRawUnsafe.mock.calls.length
    // 接続できなかった時点で打ち切る (残りの文を 1 つずつプール待ちさせない)。
    // 1 文 = SET LOCAL + DDL の 2 呼び出し。
    expect(callsAfterFirst).toBe(2)

    // 枯渇を観測した直後は DDL を撃たない
    expect(await ensureSchema()).toBe(false)
    expect(executeRawUnsafe.mock.calls.length).toBe(callsAfterFirst)

    // A later call on the same warm instance retries all statements instead of
    // being stuck returning the cached failure for the process lifetime.
    underPressure = false
    expect(await ensureSchema()).toBe(true)
    expect(executeRawUnsafe.mock.calls.length).toBeGreaterThan(callsAfterFirst)
  })

  it("keeps returning a completed result while the DB is under pressure", async () => {
    executeRawUnsafe.mockResolvedValue(undefined)
    const { ensureSchema } = await import("@/lib/ensure-schema")
    expect(await ensureSchema()).toBe(true)

    // 適用済みのインスタンスが、枯渇中だけ「未適用」と答えてはいけない
    underPressure = true
    expect(await ensureSchema()).toBe(true)
  })

  it("caches a run that failed for a non-connection reason (e.g. missing privileges)", async () => {
    executeRawUnsafe.mockRejectedValueOnce(new Error("permission denied for schema public"))
    executeRawUnsafe.mockResolvedValue(undefined)
    const { ensureSchema } = await import("@/lib/ensure-schema")

    expect(await ensureSchema()).toBe(false)
    const callsAfterFirst = executeRawUnsafe.mock.calls.length

    expect(await ensureSchema()).toBe(false)
    expect(executeRawUnsafe.mock.calls.length).toBe(callsAfterFirst)
  })

  it("runs every DDL with a lock timeout so it cannot queue readers behind it", async () => {
    executeRawUnsafe.mockResolvedValue(undefined)
    const { ensureSchema } = await import("@/lib/ensure-schema")
    await ensureSchema()

    const sqls = executeRawUnsafe.mock.calls.map((c) => String(c[0]))
    expect(sqls.length % 2).toBe(0)
    for (let i = 0; i < sqls.length; i += 2) {
      expect(sqls[i]).toMatch(/^SET LOCAL lock_timeout = '\d+s'$/)
      expect(sqls[i + 1]).not.toMatch(/lock_timeout/)
    }
  })

  it("only revokes materialized-view grants that actually exist", async () => {
    executeRawUnsafe.mockResolvedValue(undefined)
    const { ensureSchema } = await import("@/lib/ensure-schema")
    await ensureSchema()

    const revoke = executeRawUnsafe.mock.calls
      .map((c) => String(c[0]))
      .find((sql) => sql.includes("REVOKE ALL"))
    expect(revoke).toContain("aclexplode(c.relacl)")
  })
})

import { describe, it, expect, vi, beforeEach } from "vitest"

const executeRawUnsafe = vi.fn()

vi.mock("@/lib/db", () => ({
  prisma: {
    $executeRawUnsafe: (...args: unknown[]) => executeRawUnsafe(...args),
    $transaction: (ops: Promise<unknown>[]) => Promise.all(ops),
  },
}))

describe("ensureSchema", () => {
  beforeEach(() => {
    executeRawUnsafe.mockReset()
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

    // A later call on the same warm instance retries all statements instead of
    // being stuck returning the cached failure for the process lifetime.
    expect(await ensureSchema()).toBe(true)
    expect(executeRawUnsafe.mock.calls.length).toBeGreaterThan(callsAfterFirst)
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

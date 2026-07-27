import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * expire-plans cron の実ルートハンドラを対象にした単体テスト。
 *
 * 以前はテストファイル内に WHERE 条件を手書きで再実装 (`shouldExpire`) して
 * それだけを検証しており、実際の `src/app/api/cron/expire-plans/route.ts` の
 * Prisma `where` 句が壊れても (例: `planTier: {gt: 0}` → `{gte: 0}` の
 * ような改変) このテストは何も検知できなかった。
 * ここでは prisma をモックし、実ルートが呼ぶ `updateMany` の `where` 句を
 * 直接検証する。
 */

const { updateMany } = vi.hoisted(() => ({ updateMany: vi.fn() }))

vi.mock("@/lib/db", () => ({
  prisma: {
    company: {
      updateMany,
    },
  },
}))

describe("GET /api/cron/expire-plans", () => {
  beforeEach(() => {
    updateMany.mockReset()
    updateMany.mockResolvedValue({ count: 3 })
    delete process.env.CRON_SECRET
  })

  it("calls updateMany with the documented target filter", async () => {
    const { GET } = await import("@/app/api/cron/expire-plans/route")
    const res = await GET(new Request("https://example.com/api/cron/expire-plans"))
    const json = await res.json()

    expect(updateMany).toHaveBeenCalledTimes(1)
    const { where, data } = updateMany.mock.calls[0][0]

    expect(where.planType).toEqual({ in: ["monthly_12", "monthly_24", "sns_client"] })
    expect(where.planTier).toEqual({ gt: 0 })
    expect(where.planPaidUntil).toHaveProperty("lt")
    expect(where.planPaidUntil.lt).toBeInstanceOf(Date)
    expect(data).toEqual({ planTier: 0 })

    expect(json).toEqual(
      expect.objectContaining({ ok: true, downgraded: 3 })
    )
  })

  it("rejects requests with a wrong Bearer token when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "s3cr3t"
    const { GET } = await import("@/app/api/cron/expire-plans/route")
    const res = await GET(
      new Request("https://example.com/api/cron/expire-plans", {
        headers: { authorization: "Bearer wrong" },
      })
    )
    expect(res.status).toBe(401)
    expect(updateMany).not.toHaveBeenCalled()
  })

  it("accepts requests with the correct Bearer token when CRON_SECRET is set", async () => {
    process.env.CRON_SECRET = "s3cr3t"
    const { GET } = await import("@/app/api/cron/expire-plans/route")
    const res = await GET(
      new Request("https://example.com/api/cron/expire-plans", {
        headers: { authorization: "Bearer s3cr3t" },
      })
    )
    expect(res.status).toBe(200)
    expect(updateMany).toHaveBeenCalledTimes(1)
  })
})

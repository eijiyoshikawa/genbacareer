import { beforeEach, describe, expect, it, vi } from "vitest"

const { findUnique, create, update } = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    application: { findUnique },
    billingEvent: { create, update },
  },
}))

import { createHiringInvoice } from "@/lib/billing"
import { resolveHiringFee } from "@/lib/hiring-fee"

describe("createHiringInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    create.mockResolvedValue({ id: "be1", status: "pending" })
  })

  it("pending の BillingEvent を作るだけで、failed にも invoiced にもしない", async () => {
    findUnique.mockResolvedValue({
      offerSalaryMin: null,
      offerSalaryMax: null,
      offerSalaryType: null,
      company: { id: "c1" },
      job: { hiringFeeAmount: 300000, salaryMin: null, salaryMax: null, salaryType: null },
    })

    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    const result = await createHiringInvoice("a1")
    vi.unstubAllGlobals()

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          companyId: "c1",
          applicationId: "a1",
          status: "pending",
          amount: 300000,
        }),
      })
    )
    // 外部 API (MoneyForward) は呼ばない。発行は /admin/billing-todo から手動
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(update).not.toHaveBeenCalled()
    expect(result.status).toBe("pending")
  })

  it("内定時点の給与スナップショットを求人の現在値より優先する", async () => {
    findUnique.mockResolvedValue({
      offerSalaryMin: 400000,
      offerSalaryMax: 500000,
      offerSalaryType: "monthly",
      company: { id: "c1" },
      // 採用確定の直前に求人の給与を下げても、請求額は内定時点の給与で決まる
      job: { hiringFeeAmount: null, salaryMin: 100000, salaryMax: 100000, salaryType: "monthly" },
    })

    await createHiringInvoice("a1")

    const expected = resolveHiringFee({
      hiringFeeAmount: null,
      salaryMin: 400000,
      salaryMax: 500000,
      salaryType: "monthly",
    })
    expect(create.mock.calls[0][0].data.amount).toBe(expected)
  })

  it("応募が見つからなければ例外を投げる", async () => {
    findUnique.mockResolvedValue(null)
    await expect(createHiringInvoice("missing")).rejects.toThrow()
    expect(create).not.toHaveBeenCalled()
  })
})

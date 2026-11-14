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
    company: { update: vi.fn() },
  },
}))

import { createHiringInvoice } from "@/lib/billing"

describe("createHiringInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllEnvs()
    findUnique.mockResolvedValue({
      company: { id: "c1", name: "テスト建設", contactEmail: null, mfPartnerId: null },
      job: {
        title: "型枠大工",
        hiringFeeAmount: 300000,
        salaryMin: null,
        salaryMax: null,
        salaryType: null,
      },
      user: { name: "山田" },
    })
    create.mockResolvedValue({ id: "be1", status: "pending" })
  })

  it("MoneyForward 未設定なら pending のまま残す (failed にしない)", async () => {
    vi.stubEnv("MF_CLIENT_ID", "")
    vi.stubEnv("MF_CLIENT_SECRET", "")
    vi.stubEnv("MF_OFFICE_ID", "")

    const result = await createHiringInvoice("a1")

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "pending", amount: 300000 }),
      })
    )
    expect(update).not.toHaveBeenCalled()
    expect(result.provider).toBe("manual")
  })

  it("MoneyForward 連携が失敗しても failed に落とさない", async () => {
    vi.stubEnv("MF_CLIENT_ID", "id")
    vi.stubEnv("MF_CLIENT_SECRET", "secret")
    vi.stubEnv("MF_OFFICE_ID", "office")
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("boom", { status: 500 }))
    )
    vi.spyOn(console, "error").mockImplementation(() => {})

    const result = await createHiringInvoice("a1")

    expect(update).not.toHaveBeenCalled()
    expect(result.provider).toBe("manual")
    vi.unstubAllGlobals()
  })
})

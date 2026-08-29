import { describe, it, expect, vi, beforeEach } from "vitest"

const findUniqueMock = vi.fn()
const billingEventCreateMock = vi.fn()
const billingEventUpdateMock = vi.fn()
const createMfPartnerMock = vi.fn()
const createMfBillingMock = vi.fn()

vi.mock("@/lib/db", () => ({
  prisma: {
    application: { findUnique: (...args: unknown[]) => findUniqueMock(...args) },
    billingEvent: {
      create: (...args: unknown[]) => billingEventCreateMock(...args),
      update: (...args: unknown[]) => billingEventUpdateMock(...args),
    },
  },
}))

vi.mock("@/lib/moneyforward", () => ({
  createMfPartner: (...args: unknown[]) => createMfPartnerMock(...args),
  createMfBilling: (...args: unknown[]) => createMfBillingMock(...args),
}))

function makeApplication(planType: string) {
  return {
    id: "app-1",
    company: {
      id: "company-1",
      name: "テスト建設",
      contactEmail: "test@example.com",
      mfPartnerId: "partner-1",
      planType,
    },
    job: { title: "型枠大工", hiringFeeAmount: null },
    user: { name: "山田太郎" },
  }
}

describe("createHiringInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("invoices success_fee-plan companies per hire", async () => {
    const { createHiringInvoice } = await import("@/lib/billing")
    findUniqueMock.mockResolvedValue(makeApplication("success_fee"))
    billingEventCreateMock.mockResolvedValue({ id: "billing-1" })
    createMfBillingMock.mockResolvedValue({ id: "mf-billing-1" })
    billingEventUpdateMock.mockResolvedValue({ id: "billing-1", status: "invoiced" })

    const result = await createHiringInvoice("app-1")

    expect(billingEventCreateMock).toHaveBeenCalled()
    expect(createMfBillingMock).toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  it.each(["monthly_12", "monthly_24", "campaign_free", "sns_client"])(
    "does NOT invoice %s-plan companies per hire (already prepaid / no per-hire fee)",
    async (planType) => {
      const { createHiringInvoice } = await import("@/lib/billing")
      findUniqueMock.mockResolvedValue(makeApplication(planType))

      const result = await createHiringInvoice("app-1")

      expect(result).toBeNull()
      expect(billingEventCreateMock).not.toHaveBeenCalled()
      expect(createMfBillingMock).not.toHaveBeenCalled()
    }
  )
})

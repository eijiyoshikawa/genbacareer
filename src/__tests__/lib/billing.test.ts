import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * createHiringInvoice は成果報酬プラン (success_fee) の採用時のみ
 * 請求書を発行する。月額 / キャンペーン / SNS 枠は月額サブスクリプション or
 * 無料枠であり、採用時課金の対象外 (docs/business-model-handover.md 1-1)。
 * ここを誤ると対象外プランの企業にも ¥498,000〜 が誤請求される。
 */

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
    company: { update: vi.fn() },
  },
}))

vi.mock("@/lib/moneyforward", () => ({
  createMfPartner: (...args: unknown[]) => createMfPartnerMock(...args),
  createMfBilling: (...args: unknown[]) => createMfBillingMock(...args),
}))

function mockApplication(planType: string) {
  return {
    id: "app-1",
    company: {
      id: "company-1",
      name: "テスト建設",
      contactEmail: "test@example.com",
      mfPartnerId: "mf-partner-1",
      planType,
    },
    job: { title: "とび職", hiringFeeAmount: null },
    user: { name: "山田太郎" },
  }
}

describe("createHiringInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    billingEventCreateMock.mockResolvedValue({ id: "billing-1" })
    createMfBillingMock.mockResolvedValue({ id: "mf-bill-1", pdf_url: "https://example.com/x.pdf" })
    billingEventUpdateMock.mockResolvedValue({ id: "billing-1", status: "invoiced" })
  })

  it("invoices success_fee plan companies", async () => {
    const { createHiringInvoice } = await import("@/lib/billing")
    findUniqueMock.mockResolvedValue(mockApplication("success_fee"))

    const result = await createHiringInvoice("app-1")

    expect(billingEventCreateMock).toHaveBeenCalled()
    expect(createMfBillingMock).toHaveBeenCalled()
    expect(result).not.toBeNull()
  })

  it.each(["monthly_12", "monthly_24", "campaign_free", "sns_client"])(
    "does NOT invoice %s plan companies",
    async (planType) => {
      const { createHiringInvoice } = await import("@/lib/billing")
      findUniqueMock.mockResolvedValue(mockApplication(planType))

      const result = await createHiringInvoice("app-1")

      expect(billingEventCreateMock).not.toHaveBeenCalled()
      expect(createMfBillingMock).not.toHaveBeenCalled()
      expect(result).toBeNull()
    },
  )
})

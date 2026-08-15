import { describe, it, expect, vi, beforeEach } from "vitest"

/**
 * POST /api/company/applications/bulk のステータス遷移 + hired 課金整合性テスト。
 *
 * 修正前のバグ:
 *   - VALID_STATUS_TRANSITIONS を検証せず、hired/rejected 等の終端ステータスから
 *     巻き戻せてしまっていた
 *   - hired への一括変更が hiredAt 記録 / 成果報酬請求書発行 (createHiringInvoice)
 *     を一切トリガーしなかった (単体更新 API とは異なる挙動、無料採用の抜け穴)
 */

const A1 = "2db26855-580c-4314-b075-5ae378eccb24"
const A2 = "5aea0960-8697-4a5d-8d4f-095597ee7dc8"

const findManyMock = vi.fn()
const updateManyMock = vi.fn()
const updateMock = vi.fn()
const billingFindFirstMock = vi.fn()
const createHiringInvoiceMock = vi.fn()

vi.mock("@/lib/auth", () => ({
  auth: vi.fn().mockResolvedValue({
    user: { id: "user-1", companyId: "company-1" },
  }),
}))

vi.mock("@/lib/db", () => ({
  prisma: {
    application: {
      findMany: (...args: unknown[]) => findManyMock(...args),
      updateMany: (...args: unknown[]) => updateManyMock(...args),
      update: (...args: unknown[]) => updateMock(...args),
    },
    billingEvent: {
      findFirst: (...args: unknown[]) => billingFindFirstMock(...args),
    },
  },
}))

vi.mock("@/lib/billing", () => ({
  createHiringInvoice: (...args: unknown[]) => createHiringInvoiceMock(...args),
}))

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/company/applications/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("POST /api/company/applications/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    updateManyMock.mockResolvedValue({ count: 0 })
    updateMock.mockResolvedValue({})
    billingFindFirstMock.mockResolvedValue(null)
    createHiringInvoiceMock.mockResolvedValue({ billingEvent: {} })
  })

  it("skips applications that cannot legally transition to the target status", async () => {
    const { POST } = await import("@/app/api/company/applications/bulk/route")
    findManyMock.mockResolvedValue([
      { id: A1, status: "hired", hiredAt: new Date() }, // terminal, cannot move
      { id: A2, status: "applied", hiredAt: null }, // applied -> rejected is valid
    ])
    updateManyMock.mockResolvedValue({ count: 1 })

    const res = await POST(makeRequest({ ids: [A1, A2], status: "rejected" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.skipped).toBe(1)
    expect(updateManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: { in: [A2] }, companyId: "company-1" },
        data: { status: "rejected" },
      }),
    )
  })

  it("stamps hiredAt and creates a billing invoice for each valid hired transition", async () => {
    const { POST } = await import("@/app/api/company/applications/bulk/route")
    findManyMock.mockResolvedValue([
      { id: A1, status: "offered", hiredAt: null },
      { id: A2, status: "offered", hiredAt: null },
    ])

    const res = await POST(makeRequest({ ids: [A1, A2], status: "hired" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.updated).toBe(2)
    expect(updateMock).toHaveBeenCalledTimes(2)
    expect(updateMock).toHaveBeenCalledWith({
      where: { id: A1 },
      data: { status: "hired", hiredAt: expect.any(Date) },
    })
    expect(createHiringInvoiceMock).toHaveBeenCalledWith(A1)
    expect(createHiringInvoiceMock).toHaveBeenCalledWith(A2)
  })

  it("does not re-invoice applications that already have a billing event", async () => {
    const { POST } = await import("@/app/api/company/applications/bulk/route")
    findManyMock.mockResolvedValue([{ id: A1, status: "offered", hiredAt: null }])
    billingFindFirstMock.mockResolvedValue({ id: "existing-billing" })

    await POST(makeRequest({ ids: [A1], status: "hired" }))

    expect(createHiringInvoiceMock).not.toHaveBeenCalled()
  })

  it("cannot bulk-revert a hired application back to applied", async () => {
    const { POST } = await import("@/app/api/company/applications/bulk/route")
    findManyMock.mockResolvedValue([{ id: A1, status: "hired", hiredAt: new Date() }])

    const res = await POST(makeRequest({ ids: [A1], status: "applied" }))
    const json = await res.json()

    expect(res.status).toBe(200)
    expect(json.updated).toBe(0)
    expect(json.skipped).toBe(1)
    expect(updateManyMock).not.toHaveBeenCalled()
  })
})

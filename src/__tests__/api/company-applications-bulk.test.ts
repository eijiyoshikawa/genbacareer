import { beforeEach, describe, expect, it, vi } from "vitest"

const authMock = vi.fn()
const findMany = vi.fn()
const updateMany = vi.fn()
const transaction = vi.fn()

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }))
vi.mock("@/lib/db", () => ({
  prisma: {
    application: {
      findMany: (...a: unknown[]) => findMany(...a),
      updateMany: (...a: unknown[]) => updateMany(...a),
    },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}))

import { POST } from "@/app/api/company/applications/bulk/route"

const COMPANY = "11111111-1111-4111-8111-111111111111"
const APP1 = "22222222-2222-4222-8222-222222222222"
const APP2 = "33333333-3333-4333-8333-333333333333"

function req(body: unknown) {
  return new Request("http://localhost/api/company/applications/bulk", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

describe("POST /api/company/applications/bulk", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue({
      user: { id: "cu1", role: "company_admin", companyId: COMPANY },
    })
    updateMany.mockImplementation((args) => args)
    transaction.mockImplementation(async (ops: unknown[]) =>
      ops.map(() => ({ count: 1 }))
    )
  })

  it("採用 (hired) の一括変更は拒否する (請求漏れ防止)", async () => {
    const res = await POST(req({ ids: [APP1], status: "hired" }))
    expect(res.status).toBe(400)
    expect(findMany).not.toHaveBeenCalled()
  })

  it("求職者セッションは 403", async () => {
    authMock.mockResolvedValue({ user: { id: "u1", role: "seeker" } })
    const res = await POST(req({ ids: [APP1], status: "rejected" }))
    expect(res.status).toBe(403)
  })

  it("遷移可能な自社応募のみ更新し、履歴を追記する", async () => {
    findMany.mockResolvedValue([
      { id: APP1, status: "applied", statusHistory: [] },
    ])
    const res = await POST(req({ ids: [APP1, APP2], status: "reviewing" }))
    expect(res.status).toBe(200)
    expect(findMany.mock.calls[0][0].where).toEqual({
      id: { in: [APP1, APP2] },
      companyId: COMPANY,
      status: { in: ["applied"] },
    })
    const update = updateMany.mock.calls[0][0]
    expect(update.where).toEqual({ id: APP1, companyId: COMPANY, status: "applied" })
    expect(update.data.status).toBe("reviewing")
    expect(update.data.statusHistory).toHaveLength(1)
    expect(await res.json()).toEqual({ ok: true, updated: 1, skipped: 1 })
  })
})

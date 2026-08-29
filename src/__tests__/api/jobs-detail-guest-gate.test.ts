import { describe, it, expect, vi, beforeEach } from "vitest"

const findUniqueMock = vi.fn()
const authMock = vi.fn()
const getGuestAccessibleJobIdsMock = vi.fn()

vi.mock("@/lib/db", () => ({
  prisma: {
    job: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
      update: vi.fn().mockResolvedValue({}),
    },
  },
}))

vi.mock("@/lib/auth", () => ({
  auth: (...args: unknown[]) => authMock(...args),
}))

vi.mock("@/lib/guest-job-access", () => ({
  getGuestAccessibleJobIds: (...args: unknown[]) =>
    getGuestAccessibleJobIdsMock(...args),
  isCrawlerUserAgent: () => false,
}))

function makeRequest(id: string) {
  return {
    headers: new Headers({ "user-agent": "Mozilla/5.0 test" }),
    nextUrl: { pathname: `/api/jobs/${id}` },
  } as unknown as Request & { headers: Headers }
}

describe("GET /api/jobs/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    authMock.mockResolvedValue(null)
  })

  it("blocks an unauthenticated guest from a job outside the top-GUEST_LIMIT set (guest gate)", async () => {
    const { GET } = await import("@/app/api/jobs/[id]/route")
    getGuestAccessibleJobIdsMock.mockResolvedValue(["allowed-job"])

    const res = await GET(makeRequest("gated-job") as never, {
      params: Promise.resolve({ id: "gated-job" }),
    })

    expect(res.status).toBe(404)
    expect(findUniqueMock).not.toHaveBeenCalled()
  })

  it("never selects internal-only columns (previewToken/rawData) even for allowed jobs", async () => {
    const { GET } = await import("@/app/api/jobs/[id]/route")
    getGuestAccessibleJobIdsMock.mockResolvedValue(["allowed-job"])
    findUniqueMock.mockResolvedValue({ id: "allowed-job", title: "test" })

    await GET(makeRequest("allowed-job") as never, {
      params: Promise.resolve({ id: "allowed-job" }),
    })

    expect(findUniqueMock).toHaveBeenCalledTimes(1)
    const call = findUniqueMock.mock.calls[0][0] as {
      where: { status?: string }
      select: Record<string, unknown>
    }
    expect(call.where.status).toBe("active")
    expect(call.select.previewToken).toBeUndefined()
    expect(call.select.rawData).toBeUndefined()
    expect(call.select.dedupeKey).toBeUndefined()
    expect(call.select.hiringFeeAmount).toBeUndefined()
  })

  it("skips the guest gate for logged-in users", async () => {
    const { GET } = await import("@/app/api/jobs/[id]/route")
    authMock.mockResolvedValue({ user: { id: "user-1" } })
    findUniqueMock.mockResolvedValue({ id: "any-job", title: "test" })

    const res = await GET(makeRequest("any-job") as never, {
      params: Promise.resolve({ id: "any-job" }),
    })

    expect(res.status).toBe(200)
    expect(getGuestAccessibleJobIdsMock).not.toHaveBeenCalled()
  })
})

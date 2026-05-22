import { describe, it, expect, beforeEach, vi } from "vitest"

beforeEach(() => {
  vi.resetModules()
  vi.unstubAllGlobals()
  delete process.env.LEAD_NOTIFY_SLACK_WEBHOOK
  delete process.env.LEAD_NOTIFY_EMAILS
  delete process.env.SENDGRID_API_KEY
})

const samplePayload = {
  leadId: "lead-1",
  name: "山田 太郎",
  phone: "090-1234-5678",
  email: "taro@example.com",
  experienceYears: 3,
  notes: "寮完備を希望",
  job: {
    id: "job-1",
    title: "鳶工 求人",
    prefecture: "東京都",
    city: "渋谷区",
  },
}

describe("notifyNewLead", () => {
  it("両環境変数とも未設定なら fetch も sendEmail も呼ばれない", async () => {
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const { notifyNewLead } = await import("../../lib/lead-notifications")
    await notifyNewLead(samplePayload)
    expect(mockFetch).not.toHaveBeenCalled()
  })

  it("LEAD_NOTIFY_SLACK_WEBHOOK 設定時に Slack へ POST", async () => {
    process.env.LEAD_NOTIFY_SLACK_WEBHOOK = "https://hooks.slack.test/abc"
    const mockFetch = vi.fn().mockResolvedValue({ ok: true } as Response)
    vi.stubGlobal("fetch", mockFetch)
    const { notifyNewLead } = await import("../../lib/lead-notifications")
    await notifyNewLead(samplePayload)
    expect(mockFetch).toHaveBeenCalledOnce()
    const [url, init] = mockFetch.mock.calls[0]
    expect(url).toBe("https://hooks.slack.test/abc")
    expect((init as RequestInit).method).toBe("POST")
    const body = JSON.parse(String((init as RequestInit).body))
    expect(body.text).toContain("山田 太郎")
    expect(body.text).toContain("090-1234-5678")
    expect(body.blocks).toBeInstanceOf(Array)
  })

  it("LEAD_NOTIFY_EMAILS にカンマ区切りで複数指定", async () => {
    process.env.LEAD_NOTIFY_EMAILS = "ops@example.com, sales@example.com,invalid-email"
    // SendGrid キー無し → dev fallback (sendEmail はログのみ)
    const { notifyNewLead } = await import("../../lib/lead-notifications")
    // dev fallback 経路でも例外を投げないことを確認
    await expect(notifyNewLead(samplePayload)).resolves.toBeUndefined()
  })

  it("Slack POST 失敗時も呼び出し側に例外を伝播させない", async () => {
    process.env.LEAD_NOTIFY_SLACK_WEBHOOK = "https://hooks.slack.test/abc"
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => "boom" } as Response)
    )
    const { notifyNewLead } = await import("../../lib/lead-notifications")
    await expect(notifyNewLead(samplePayload)).resolves.toBeUndefined()
  })

  it("空文字 WEBHOOK は無視", async () => {
    process.env.LEAD_NOTIFY_SLACK_WEBHOOK = "   "
    const mockFetch = vi.fn()
    vi.stubGlobal("fetch", mockFetch)
    const { notifyNewLead } = await import("../../lib/lead-notifications")
    await notifyNewLead(samplePayload)
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

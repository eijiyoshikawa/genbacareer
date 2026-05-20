import { describe, it, expect, vi, beforeEach } from "vitest"
import { sendEmail, sendApplicationConfirmEmail } from "@/lib/email"

describe("sendEmail", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    delete process.env.SENDGRID_API_KEY
  })

  it("logs to console when no SENDGRID_API_KEY", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    const result = await sendEmail({
      to: "test@example.com",
      subject: "テスト件名",
      html: "<p>テスト本文</p>",
    })
    expect(result).toEqual({ success: true, dev: true })
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("test@example.com"))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("テスト件名"))
  })
})

describe("sendApplicationConfirmEmail", () => {
  it("sends email with job title and company name", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {})
    await sendApplicationConfirmEmail("user@example.com", "施工管理の求人", "株式会社テスト")
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("user@example.com"))
    expect(spy).toHaveBeenCalledWith(expect.stringContaining("施工管理の求人"))
  })
})


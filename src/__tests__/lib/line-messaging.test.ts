import { describe, it, expect } from "vitest"
import crypto from "node:crypto"

// モジュール読み込み時に SECRET が固定されるため、import 前に環境変数をセット
process.env.LINE_CHANNEL_ACCESS_TOKEN = "test-token"
process.env.LINE_CHANNEL_SECRET = "test-secret-12345"

const { verifyWebhookSignature, isMessagingConfigured } = await import("../../lib/line-messaging")

function sign(body: string, secret = "test-secret-12345"): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64")
}

describe("verifyWebhookSignature", () => {
  it("正しい署名を受理する", () => {
    const body = JSON.stringify({ events: [] })
    const sig = sign(body)
    expect(verifyWebhookSignature(body, sig)).toBe(true)
  })

  it("壊れた署名を拒否する", () => {
    const body = JSON.stringify({ events: [] })
    expect(verifyWebhookSignature(body, "invalid_signature_value_here_xxx")).toBe(false)
  })

  it("署名なしを拒否する", () => {
    expect(verifyWebhookSignature("body", null)).toBe(false)
    expect(verifyWebhookSignature("body", "")).toBe(false)
  })

  it("body 改ざんで検証失敗する", () => {
    const original = JSON.stringify({ events: [] })
    const tampered = JSON.stringify({ events: [{ type: "follow" }] })
    const sig = sign(original)
    expect(verifyWebhookSignature(tampered, sig)).toBe(false)
  })

  it("異なる長さの署名は即 false（timingSafeEqual エラー回避）", () => {
    const body = "x"
    expect(verifyWebhookSignature(body, "short")).toBe(false)
  })
})

describe("isMessagingConfigured", () => {
  it("TOKEN / SECRET 両方セット時は true", () => {
    expect(isMessagingConfigured()).toBe(true)
  })
})

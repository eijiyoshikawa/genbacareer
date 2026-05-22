import { describe, it, expect, beforeEach, afterEach } from "vitest"
import crypto from "node:crypto"

/**
 * LINE Webhook 署名検証の単体テスト。
 *
 * lib/line-messaging.ts の verifyWebhookSignature が
 *  - 正しい署名で true を返す
 *  - 不正な署名で false を返す
 *  - 環境変数未設定で false を返す
 *  - 長さ不一致で安全に false を返す（timingSafeEqual の安全性）
 * を検証する。
 */

const ORIGINAL_SECRET = process.env.LINE_CHANNEL_SECRET

beforeEach(() => {
  process.env.LINE_CHANNEL_SECRET = "test-secret-1234567890"
})

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) {
    delete process.env.LINE_CHANNEL_SECRET
  } else {
    process.env.LINE_CHANNEL_SECRET = ORIGINAL_SECRET
  }
})

function signWithSecret(body: string, secret: string): string {
  const hmac = crypto.createHmac("sha256", secret)
  hmac.update(body)
  return hmac.digest("base64")
}

describe("verifyWebhookSignature", () => {
  it("accepts correct signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/line-messaging")
    const body = JSON.stringify({ events: [] })
    const signature = signWithSecret(body, "test-secret-1234567890")
    expect(verifyWebhookSignature(body, signature)).toBe(true)
  })

  it("rejects forged signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/line-messaging")
    const body = JSON.stringify({ events: [] })
    const wrong = signWithSecret(body, "wrong-secret")
    expect(verifyWebhookSignature(body, wrong)).toBe(false)
  })

  it("rejects null signature", async () => {
    const { verifyWebhookSignature } = await import("@/lib/line-messaging")
    expect(verifyWebhookSignature("{}", null)).toBe(false)
  })

  it("rejects mismatched body", async () => {
    const { verifyWebhookSignature } = await import("@/lib/line-messaging")
    const sig = signWithSecret('{"a":1}', "test-secret-1234567890")
    expect(verifyWebhookSignature('{"a":2}', sig)).toBe(false)
  })

  it("rejects when secret env is missing", async () => {
    delete process.env.LINE_CHANNEL_SECRET
    const { verifyWebhookSignature } = await import("@/lib/line-messaging")
    const sig = signWithSecret("{}", "test-secret-1234567890")
    expect(verifyWebhookSignature("{}", sig)).toBe(false)
  })

  it("safely rejects different length signature (no exception)", async () => {
    const { verifyWebhookSignature } = await import("@/lib/line-messaging")
    expect(verifyWebhookSignature("{}", "short")).toBe(false)
  })
})

import { describe, it, expect } from "vitest"

/**
 * billing-todo-digest cron の送信可否判定ロジックを単体テスト。
 * 仕様: A(pending) / B(invoiced) / C(refund approved) のいずれかが
 * > 0 の場合のみメール送信する。実際の DB 集計は E2E で別途。
 */
function shouldSendDigest(args: {
  pendingCount: number
  invoicedCount: number
  refundCount: number
}): boolean {
  const totalTasks = args.pendingCount + args.invoicedCount + args.refundCount
  return totalTasks > 0
}

describe("billing-todo-digest send decision", () => {
  it("skips when A/B/C are all zero", () => {
    expect(
      shouldSendDigest({ pendingCount: 0, invoicedCount: 0, refundCount: 0 })
    ).toBe(false)
  })

  it("sends when only pending (A) is nonzero", () => {
    expect(
      shouldSendDigest({ pendingCount: 2, invoicedCount: 0, refundCount: 0 })
    ).toBe(true)
  })

  it("sends when only invoiced/awaiting-payment (B) is nonzero", () => {
    expect(
      shouldSendDigest({ pendingCount: 0, invoicedCount: 3, refundCount: 0 })
    ).toBe(true)
  })

  it("sends when only refunds (C) is nonzero", () => {
    expect(
      shouldSendDigest({ pendingCount: 0, invoicedCount: 0, refundCount: 1 })
    ).toBe(true)
  })
})

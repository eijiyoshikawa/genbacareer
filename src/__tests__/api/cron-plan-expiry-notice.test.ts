import { describe, it, expect } from "vitest"

/**
 * plan-expiry-notice cron の「メール送信に失敗したら再送対象として残す」ロジックの
 * 回帰テスト。実際の DB / メール送信は E2E で別途。
 *
 * 過去のバグ: メール送信が catch されて処理は続行するが、その後
 * planExpiryNotifiedAt を無条件に set していたため、SMTP 障害等で送信に
 * 失敗した企業も「通知済み」扱いになり、WHERE 句 `planExpiryNotifiedAt: null`
 * から永久に除外されてしまっていた（プラン失効まで一度も通知が届かない）。
 */
function shouldMarkNotified(args: { hasContactEmail: boolean; mailFailed: boolean }): boolean {
  const { hasContactEmail, mailFailed } = args
  if (hasContactEmail && mailFailed) return false
  return true
}

describe("plan-expiry-notice: planExpiryNotifiedAt gating", () => {
  it("marks notified when mail sends successfully", () => {
    expect(shouldMarkNotified({ hasContactEmail: true, mailFailed: false })).toBe(true)
  })

  it("does NOT mark notified when mail send fails (allows retry next run)", () => {
    expect(shouldMarkNotified({ hasContactEmail: true, mailFailed: true })).toBe(false)
  })

  it("marks notified when there is no contactEmail (site notification is the only channel)", () => {
    expect(shouldMarkNotified({ hasContactEmail: false, mailFailed: false })).toBe(true)
  })
})

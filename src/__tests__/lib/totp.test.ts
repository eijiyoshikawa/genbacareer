import { describe, it, expect } from "vitest"
import { generateSync } from "otplib"
import { generateTotpSecret, verifyTotpStep, currentCode } from "@/lib/totp"

const PERIOD = 30
const DIGITS = 6

describe("verifyTotpStep", () => {
  it("accepts a valid current code and returns a step close to now", () => {
    const secret = generateTotpSecret()
    const before = Math.floor(Date.now() / 1000 / PERIOD)
    const code = currentCode(secret)
    const step = verifyTotpStep(code, secret)
    const after = Math.floor(Date.now() / 1000 / PERIOD)
    expect(step).not.toBeNull()
    // ステップ境界をまたいだ場合も許容できるよう範囲でチェックする
    expect(step as number).toBeGreaterThanOrEqual(before)
    expect(step as number).toBeLessThanOrEqual(after)
  })

  it("rejects a wrong code", () => {
    const secret = generateTotpSecret()
    const valid = currentCode(secret)
    // ずらして必ず異なる 6 桁にする
    const wrong = String((Number(valid) + 1) % 1000000).padStart(6, "0")
    expect(verifyTotpStep(wrong, secret)).toBeNull()
  })

  it("rejects malformed input (not exactly 6 digits)", () => {
    const secret = generateTotpSecret()
    expect(verifyTotpStep("12345", secret)).toBeNull()
    expect(verifyTotpStep("1234567", secret)).toBeNull()
    expect(verifyTotpStep("abcdef", secret)).toBeNull()
    expect(verifyTotpStep("", secret)).toBeNull()
  })

  it("returns null for a code from a different secret", () => {
    const secretA = generateTotpSecret()
    const secretB = generateTotpSecret()
    const codeForA = currentCode(secretA)
    expect(verifyTotpStep(codeForA, secretB)).toBeNull()
  })

  // リプレイ防止の要（この session で追加）: 同じコードは常に同じステップ番号を
  // 返すため、呼び出し側は「前回受理したステップ以下なら拒否」で防げる。
  it("returns the same step for the same code across repeated calls (replay-check precondition)", () => {
    const secret = generateTotpSecret()
    const code = currentCode(secret)
    const step1 = verifyTotpStep(code, secret)
    const step2 = verifyTotpStep(code, secret)
    expect(step1).not.toBeNull()
    expect(step1).toBe(step2)
  })

  // 本題: afterTimeStep を渡すと、前回受理済みと同じ（または過去の）
  // タイムステップのコードは再利用できない（otplib のネイティブ機能を使用）。
  it("rejects replaying the same code when afterTimeStep is set to its own step (replay protection)", () => {
    const secret = generateTotpSecret()
    const code = currentCode(secret)
    const firstStep = verifyTotpStep(code, secret)
    expect(firstStep).not.toBeNull()

    // ログイン成功後に保存したはずの totpLastUsedStep を渡して同じコードを再送
    const replay = verifyTotpStep(code, secret, firstStep)
    expect(replay).toBeNull()
  })

  it("still accepts a genuinely new code even when afterTimeStep is set to an older step", () => {
    const secret = generateTotpSecret()
    const oldStep = 0 // まだ一度もログインしていないユーザーの初期状態を模す
    const code = currentCode(secret)
    const step = verifyTotpStep(code, secret, oldStep)
    expect(step).not.toBeNull()
  })

  it("does not apply replay protection when afterTimeStep is null (first-ever login)", () => {
    const secret = generateTotpSecret()
    const code = currentCode(secret)
    expect(verifyTotpStep(code, secret, null)).not.toBeNull()
  })

  it("accepts a code from one period ago (within epochTolerance), with a strictly smaller step than the current code", () => {
    // 絶対的なステップ番号はテスト実行タイミング（境界またぎ）に左右されやすいため、
    // 実際にリプレイ防止が依拠する性質（古い方が必ず小さいステップ番号になる）
    // だけを検証する。
    const secret = generateTotpSecret()
    const nowSec = Math.floor(Date.now() / 1000)
    const priorCode = generateSync({
      secret,
      digits: DIGITS,
      period: PERIOD,
      epoch: nowSec - PERIOD,
    })
    const priorStep = verifyTotpStep(priorCode, secret)
    const currentStep = verifyTotpStep(currentCode(secret), secret)
    expect(priorStep).not.toBeNull()
    expect(currentStep).not.toBeNull()
    expect(priorStep as number).toBeLessThan(currentStep as number)
  })
})

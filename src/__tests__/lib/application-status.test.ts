import { describe, it, expect } from "vitest"
import { isValidStatusTransition } from "@/lib/application-status"

/**
 * 応募ステータスの状態遷移ルール。
 * 単体更新 API はこれを守っていたが、一括更新 API (bulk) は
 * 独自の (バリデーションなしの) 実装を持っており、
 * 例えば "applied" → "hired" への一発変更 (採用確定の自動請求を
 * スキップしてしまう) を許してしまっていた。共有モジュール化して
 * 両エンドポイントで同じルールを強制する。
 */
describe("isValidStatusTransition", () => {
  it("allows the documented forward transitions", () => {
    expect(isValidStatusTransition("applied", "reviewing")).toBe(true)
    expect(isValidStatusTransition("reviewing", "interview")).toBe(true)
    expect(isValidStatusTransition("interview", "offered")).toBe(true)
    expect(isValidStatusTransition("offered", "hired")).toBe(true)
  })

  it("allows rejecting from any non-terminal status", () => {
    expect(isValidStatusTransition("applied", "rejected")).toBe(true)
    expect(isValidStatusTransition("reviewing", "rejected")).toBe(true)
    expect(isValidStatusTransition("interview", "rejected")).toBe(true)
    expect(isValidStatusTransition("offered", "rejected")).toBe(true)
  })

  it("rejects skipping stages (e.g. applied straight to hired)", () => {
    expect(isValidStatusTransition("applied", "hired")).toBe(false)
    expect(isValidStatusTransition("applied", "interview")).toBe(false)
    expect(isValidStatusTransition("reviewing", "hired")).toBe(false)
    expect(isValidStatusTransition("reviewing", "offered")).toBe(false)
  })

  it("treats hired and rejected as terminal", () => {
    expect(isValidStatusTransition("hired", "reviewing")).toBe(false)
    expect(isValidStatusTransition("rejected", "reviewing")).toBe(false)
  })
})

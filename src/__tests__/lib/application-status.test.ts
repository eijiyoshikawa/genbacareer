import { describe, it, expect, vi, beforeEach } from "vitest"

const findUnique = vi.fn()

vi.mock("@/lib/db", () => ({
  prisma: { job: { findUnique: (...args: unknown[]) => findUnique(...args) } },
}))

import {
  isValidStatusTransition,
  buildOfferSalarySnapshotData,
} from "@/lib/application-status"

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

/**
 * 「offered」遷移時に求人の給与をスナップショットする。
 * hired は必ず offered を経由するため (VALID_STATUS_TRANSITIONS)、企業が
 * 採用確定の直前だけ求人の給与を下げて成果報酬 (理論年収×35%) を圧縮し、
 * 請求後に元へ戻すという操作を防ぐ。
 */
describe("buildOfferSalarySnapshotData", () => {
  beforeEach(() => {
    findUnique.mockReset()
  })

  it("snapshots the job's current salary when transitioning to offered", async () => {
    findUnique.mockResolvedValue({
      salaryMin: 280000,
      salaryMax: 350000,
      salaryType: "monthly",
    })

    const result = await buildOfferSalarySnapshotData("offered", "job-1")

    expect(findUnique).toHaveBeenCalledWith({
      where: { id: "job-1" },
      select: { salaryMin: true, salaryMax: true, salaryType: true },
    })
    expect(result).toEqual({
      offerSalaryMin: 280000,
      offerSalaryMax: 350000,
      offerSalaryType: "monthly",
    })
  })

  it("does nothing for other status transitions", async () => {
    const result = await buildOfferSalarySnapshotData("hired", "job-1")
    expect(result).toBeUndefined()
    expect(findUnique).not.toHaveBeenCalled()
  })

  it("falls back to nulls if the job is missing", async () => {
    findUnique.mockResolvedValue(null)
    const result = await buildOfferSalarySnapshotData("offered", "job-missing")
    expect(result).toEqual({
      offerSalaryMin: null,
      offerSalaryMax: null,
      offerSalaryType: null,
    })
  })
})

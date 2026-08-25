import { describe, it, expect } from "vitest"
import { VALID_STATUS_TRANSITIONS } from "@/lib/application-status"

/**
 * 応募ステータスの状態遷移テーブルを単体テスト。
 *
 * このテーブルは単体更新 (PUT /api/company/applications/[id]) と
 * 一括更新 (POST /api/company/applications/bulk) の両方が
 * applyApplicationStatusChange 経由で共有する。どちらの経路でも
 * 不正な遷移 (例: applied → hired への直接ジャンプで請求をスキップする)
 * が起きないことを保証する。
 */
describe("VALID_STATUS_TRANSITIONS", () => {
  it("allows the happy-path progression toward hired", () => {
    expect(VALID_STATUS_TRANSITIONS.applied).toContain("reviewing")
    expect(VALID_STATUS_TRANSITIONS.reviewing).toContain("interview")
    expect(VALID_STATUS_TRANSITIONS.interview).toContain("offered")
    expect(VALID_STATUS_TRANSITIONS.offered).toContain("hired")
  })

  it("allows rejecting from any non-terminal status", () => {
    for (const status of ["applied", "reviewing", "interview", "offered"]) {
      expect(VALID_STATUS_TRANSITIONS[status]).toContain("rejected")
    }
  })

  it("only reaches hired from offered (never skips billing-triggering step)", () => {
    for (const [status, transitions] of Object.entries(
      VALID_STATUS_TRANSITIONS
    )) {
      if (status === "offered") continue
      expect(transitions).not.toContain("hired")
    }
  })

  it("treats hired and rejected as terminal statuses", () => {
    expect(VALID_STATUS_TRANSITIONS.hired).toBeUndefined()
    expect(VALID_STATUS_TRANSITIONS.rejected).toBeUndefined()
  })

  it("never allows a backward transition", () => {
    // 遷移テーブルに定義された各 from→to が、どの to からも再度戻れないことを確認
    const order = ["applied", "reviewing", "interview", "offered", "hired"]
    for (let i = 0; i < order.length; i++) {
      for (let j = 0; j <= i; j++) {
        const from = order[i]
        const to = order[j]
        if (from === to) continue
        const transitions = VALID_STATUS_TRANSITIONS[from] ?? []
        expect(transitions).not.toContain(to)
      }
    }
  })
})

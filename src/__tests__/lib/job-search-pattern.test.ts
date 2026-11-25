import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/db", () => ({ prisma: {}, noteDbError: () => false }))

import { toContainsPattern } from "@/lib/job-search"

describe("toContainsPattern", () => {
  it("キーワードを % で挟む", () => {
    expect(toContainsPattern("型枠大工")).toBe("%型枠大工%")
  })

  it("% _ \\ はワイルドカードにならないようエスケープする", () => {
    expect(toContainsPattern("100%_a\\b")).toBe("%100\\%\\_a\\\\b%")
  })
})

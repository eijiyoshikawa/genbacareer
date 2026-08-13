import { describe, expect, it } from "vitest"
import { toAlertBatch } from "@/lib/saved-searches"

type Row = { id: string; publishedAt: Date | null }

function job(id: string, publishedAt: string | null): Row {
  return { id, publishedAt: publishedAt ? new Date(publishedAt) : null }
}

describe("toAlertBatch", () => {
  it("shows all matches newest-first and advances the cursor to startedAt-equivalent when nothing is left over", () => {
    // DB は publishedAt 昇順（古い→新しい）で返す想定
    const fetchedAsc = [job("c", "2026-01-03"), job("b", "2026-01-04"), job("a", "2026-01-05")]
    const batch = toAlertBatch(fetchedAsc, 5)

    expect(batch.hasMore).toBe(false)
    // 通知本文には新着順（新しいものが先）で並ぶ
    expect(batch.matches.map((m) => m.id)).toEqual(["a", "b", "c"])

    const startedAt = new Date("2026-01-10")
    expect(batch.nextCursor(startedAt)).toEqual(new Date("2026-01-05T00:00:00.001Z"))
  })

  it("never skips an unseen match: cursor only advances past what was actually processed", () => {
    // limit=5 だが 6 件ヒット（古い→新しい順）。最も古い 5 件を今回処理する。
    const fetchedAsc = [
      job("f", "2026-01-01"), // 最古 = 今回処理される
      job("e", "2026-01-02"),
      job("d", "2026-01-03"),
      job("c", "2026-01-04"),
      job("b", "2026-01-05"), // 今回処理する中で最新 = ここまでがカーソル
      job("a", "2026-01-06"), // まだ未処理（次回に回る）
    ]
    const batch = toAlertBatch(fetchedAsc, 5)

    expect(batch.hasMore).toBe(true)
    // 表示は新着順（f が最初に取りこぼされていたバグ対象）
    expect(batch.matches.map((m) => m.id)).toEqual(["b", "c", "d", "e", "f"])
    expect(batch.matches).toHaveLength(5)

    const startedAt = new Date("2026-01-10")
    const nextSince = batch.nextCursor(startedAt)
    // カーソルは「今回処理した最新分 (b, 01-05)」の直後まで。
    // "a" (01-06) は `publishedAt: { gte: nextSince }` に含まれ続けるので、
    // 次回バッチで確実に拾われる = 恒久ロストしない。
    expect(nextSince.getTime()).toBe(fetchedAsc[4].publishedAt!.getTime() + 1)
    expect(nextSince.getTime()).toBeLessThan(fetchedAsc[5].publishedAt!.getTime())
    expect(nextSince.getTime()).toBeLessThan(startedAt.getTime())
  })

  it("falls back to startedAt when there are no matches at all", () => {
    const batch = toAlertBatch([] as Row[], 5)
    expect(batch.matches).toHaveLength(0)
    expect(batch.hasMore).toBe(false)
    const startedAt = new Date("2026-01-10")
    expect(batch.nextCursor(startedAt)).toEqual(startedAt)
  })
})

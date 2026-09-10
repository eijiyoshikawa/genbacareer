import { describe, it, expect } from "vitest"
import {
  nextCursor,
  FETCH_CAP,
  DISPLAY_LIMIT,
} from "@/app/api/cron/saved-search-alerts/route"

/**
 * 新着求人が DISPLAY_LIMIT (通知に表示する件数) を超えても、
 * FETCH_CAP に達しない限りは lastNotifiedAt を今回の実行時刻まで
 * 進めて問題ない（全件拾えているため）。
 *
 * FETCH_CAP ちょうど取得できた場合は「まだ拾いきれていない新着が
 * 残っている可能性がある」とみなし、今回拾えた最古の求人の直後まで
 * しか進めない。旧実装はここを無条件で startedAt まで進めていたため、
 * FETCH_CAP（旧: 表示件数と同じ 5）を超える新着は永久に通知されなかった。
 */
describe("nextCursor", () => {
  const startedAt = new Date("2026-06-01T09:00:00Z")

  it("advances to startedAt when fewer than FETCH_CAP jobs matched", () => {
    const matches = Array.from({ length: DISPLAY_LIMIT + 3 }, (_, i) => ({
      publishedAt: new Date(startedAt.getTime() - i * 1000),
    }))
    expect(matches.length).toBeLessThan(FETCH_CAP)
    expect(nextCursor(matches, startedAt)).toEqual(startedAt)
  })

  it("advances to startedAt when there are zero matches", () => {
    expect(nextCursor([], startedAt)).toEqual(startedAt)
  })

  it("does NOT jump to startedAt when exactly FETCH_CAP jobs matched (more may remain)", () => {
    const oldest = new Date("2026-05-31T12:00:00Z")
    const matches = Array.from({ length: FETCH_CAP }, (_, i) => ({
      // ORDER BY publishedAt DESC を模して、配列の最後を最も古い求人にする
      publishedAt: new Date(oldest.getTime() + (FETCH_CAP - 1 - i) * 1000),
    }))
    const cursor = nextCursor(matches, startedAt)
    expect(cursor).not.toEqual(startedAt)
    expect(cursor.getTime()).toBe(oldest.getTime() + 1)
  })

  it("falls back to startedAt if the oldest match has no publishedAt", () => {
    const matches = Array.from({ length: FETCH_CAP }, () => ({
      publishedAt: null,
    }))
    expect(nextCursor(matches, startedAt)).toEqual(startedAt)
  })
})

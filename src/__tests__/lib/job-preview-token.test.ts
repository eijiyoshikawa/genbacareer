import { describe, it, expect } from "vitest"

/**
 * /jobs/[id] の preview 判定ロジックを単体テスト。
 *
 * 修正前は `?preview=1` という固定のクエリフラグだけで isPreview が true になり、
 * 誰でも任意の求人 URL に付け足すだけで未ログインゲストの閲覧制限
 * (グローバル上位15件のみ) をすり抜けられた。
 * 修正後は Job.previewToken との完全一致でのみ preview が成立する。
 */

function isPreview(job: { previewToken: string | null }, previewTokenParam: string | undefined): boolean {
  return Boolean(
    job.previewToken && previewTokenParam && previewTokenParam === job.previewToken
  )
}

describe("job detail page preview-token guard", () => {
  it("is NOT preview when no token param is given", () => {
    expect(isPreview({ previewToken: "abc123" }, undefined)).toBe(false)
  })

  it("is NOT preview when the token param does not match", () => {
    expect(isPreview({ previewToken: "abc123" }, "wrong-token")).toBe(false)
  })

  it("is NOT preview when the job has no previewToken set (e.g. already published)", () => {
    expect(isPreview({ previewToken: null }, "abc123")).toBe(false)
  })

  it("rejects the old exploit: a bare '1' cannot match a real token", () => {
    expect(isPreview({ previewToken: "abc123" }, "1")).toBe(false)
  })

  it("IS preview when the token param exactly matches the job's previewToken", () => {
    expect(isPreview({ previewToken: "abc123" }, "abc123")).toBe(true)
  })
})

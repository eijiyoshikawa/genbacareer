import { test, expect } from "@playwright/test"
import { validateJobPostingJsonLd } from "../src/lib/jobposting-validator"

/**
 * 実機 /jobs/[id] ページに埋め込まれた JobPosting JSON-LD が Google の
 * 構造化データ要件を満たすか検証する。
 *
 * 流れ:
 *   1. /api/jobs?limit=1 で実在する求人 ID を取得
 *   2. /jobs/[id] を開いて <script type="application/ld+json"> を取り出す
 *   3. JSON.parse して validateJobPostingJsonLd で必須/推奨フィールドをチェック
 *
 * 1 件しか求人がない極小 DB だと test DB の準備が必要だが、本番相当の DB
 * で実行することを想定し、求人 0 件のときは skip する。
 */
test.describe("JobPosting JSON-LD (実機検証)", () => {
  test("/jobs/[id] の JobPosting JSON-LD が Google 仕様を満たす", async ({
    request,
    page,
  }) => {
    // 1. 適当な求人 ID を 1 つ取得
    const apiRes = await request.get("/api/jobs?limit=1")
    expect(apiRes.ok()).toBe(true)
    const apiJson = await apiRes.json()
    const firstJob = apiJson.jobs?.[0]
    if (!firstJob || !firstJob.id) {
      test.skip()
      return
    }

    // 2. /jobs/[id] を開く
    await page.goto(`/jobs/${firstJob.id}`)

    // JSON-LD <script> をすべて取り出して JobPosting を含むものを探す
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()

    expect(scripts.length).toBeGreaterThan(0)

    const jobPostingRaw = scripts.find((s) => s.includes('"JobPosting"'))
    expect(
      jobPostingRaw,
      "JobPosting タイプの JSON-LD が <script type='application/ld+json'> に埋め込まれている必要があります",
    ).toBeTruthy()

    // 3. parse + validate
    let parsed: unknown
    try {
      parsed = JSON.parse(jobPostingRaw!)
    } catch (e) {
      throw new Error(`JobPosting JSON-LD のパース失敗: ${(e as Error).message}`)
    }

    const result = validateJobPostingJsonLd(parsed)

    // errors は必ず 0 (これがあると Google が拒否する)
    if (!result.valid) {
      console.error("[JobPosting validation errors]\n" + result.errors.join("\n"))
    }
    expect(result.errors, `JobPosting errors:\n${result.errors.join("\n")}`).toEqual([])

    // warnings はログ出力のみ (ビルド失敗にはしない)
    if (result.warnings.length > 0) {
      console.warn("[JobPosting warnings]\n" + result.warnings.join("\n"))
    }
  })
})

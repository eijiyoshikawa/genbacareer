import { test, expect } from "@playwright/test"

test.describe("Jobs Page", () => {
  test("一覧ページがロードされる", async ({ page }) => {
    await page.goto("/jobs", { waitUntil: "domcontentloaded" })
    await expect(page).toHaveTitle(/求人/)

    // 検索フォームが存在 (placeholder は "職種・キーワードで検索")
    const searchInput = page.getByPlaceholder("職種・キーワードで検索")
    await expect(searchInput).toBeVisible({ timeout: 10_000 })
  })

  test("0 件検索時に EmptyJobsState が表示される", async ({ page }) => {
    // ヒットしないであろうランダムキーワード
    await page.goto("/jobs?q=zzz_no_results_zzz_unlikely_jp_query", {
      waitUntil: "domcontentloaded",
    })

    // 「条件に合う求人が見つかりませんでした」が出る
    await expect(
      page.getByText("条件に合う求人が見つかりませんでした")
    ).toBeVisible({ timeout: 10_000 })

    // 条件を緩めるサジェスト (キーワードを外す)
    await expect(page.getByText(/キーワード「.+」を外して検索/)).toBeVisible()
  })

  test("カテゴリ絞り込みでクエリパラメータが付く", async ({ page }) => {
    await page.goto("/jobs?category=construction")
    await expect(page).toHaveURL(/category=construction/)
  })
})

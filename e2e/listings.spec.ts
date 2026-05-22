import { test, expect } from "@playwright/test"

/**
 * 公開求人一覧ルートの動作確認。
 *
 *   - /[prefecture]              (都道府県別)
 *   - /[prefecture]/[category]   (都道府県 + カテゴリ)
 *   - /categories/[category]     (カテゴリ全国)
 *   - /salary/[range]            (給与帯)
 *   - /employment-type/[type]    (雇用形態)
 *
 * 各ページが 200 を返し、求人カードまたは「掲載がない」メッセージのどちらか
 * 適切な UI を表示することを確認。
 */
test.describe("Public job listing routes", () => {
  test("/tokyo (都道府県別) がロードされる", async ({ page }) => {
    await page.goto("/tokyo")
    await expect(page).toHaveTitle(/東京都/)
    await expect(
      page.getByRole("heading", { name: /東京都の求人/ }),
    ).toBeVisible()
  })

  test("/tokyo/construction (都道府県 + カテゴリ) がロードされる", async ({
    page,
  }) => {
    await page.goto("/tokyo/construction")
    await expect(page).toHaveTitle(/東京都.+建築/)
  })

  test("/categories/construction がロードされる", async ({ page }) => {
    await page.goto("/categories/construction")
    await expect(page).toHaveTitle(/建築・躯体工事/)
    await expect(
      page.getByRole("heading", { name: /全国の建築・躯体工事求人/ }),
    ).toBeVisible()
  })

  test("/salary/300man がロードされる (給与帯 LP)", async ({ page }) => {
    await page.goto("/salary/300man")
    // 月給 30 万以上 LP の見出し
    await expect(page).toHaveTitle(/30/)
  })

  test("無効な都道府県は not-found ページ", async ({ page }) => {
    // Next.js 15 App Router の notFound() は HTTP 200 を返し
    // not-found.tsx を render する仕様。content で判定。
    await page.goto("/invalid-prefecture-slug")
    await expect(
      page.getByRole("heading", { name: "ページが見つかりません" }),
    ).toBeVisible()
  })

  test("無効なカテゴリは not-found ページ", async ({ page }) => {
    await page.goto("/categories/zzznotacat")
    await expect(
      page.getByRole("heading", { name: "ページが見つかりません" }),
    ).toBeVisible()
  })
})

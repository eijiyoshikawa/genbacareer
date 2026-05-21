import { test, expect } from "@playwright/test"

test.describe("Homepage", () => {
  test("Hero と CTA ボタンが表示される", async ({ page }) => {
    await page.goto("/")

    // ブランド名はタイトルに含まれる
    await expect(page).toHaveTitle(/ゲンバキャリア/)

    // Hero スライドの見出し文字 (h1 タグは無いので getByText で確認)
    await expect(page.getByText(/建設業の求人を/).first()).toBeVisible()

    // ヘッダー右上 or Hero CTA の「求人を探す」リンク
    const searchLink = page.getByRole("link", { name: /求人を探す/ }).first()
    await expect(searchLink).toBeVisible()
  })

  test("クイックチップから検索画面に遷移できる", async ({ page }) => {
    await page.goto("/")
    // "#未経験OK" という accessible name のチップを正確に指定
    // (求人カード内の「未経験OK」テキストとは別)
    const chip = page.getByRole("link", { name: "#未経験OK", exact: true })
    await chip.click()
    await expect(page).toHaveURL(/\/jobs\?q=/)
  })

  test("ヘッダーから求人ページに遷移できる", async ({ page }) => {
    await page.goto("/")
    const viewport = page.viewportSize()
    if (viewport && viewport.width >= 768) {
      // デスクトップ: 先頭の「求人を探す」リンクをクリック
      await page.getByRole("link", { name: /求人を探す/ }).first().click()
    } else {
      // モバイル: hamburger → ドロワー内の「求人を探す」リンクに絞る
      await page.getByRole("button", { name: /メニューを開く/ }).click()
      await page
        .locator("#header-mobile-drawer")
        .getByRole("link", { name: "求人を探す", exact: true })
        .click()
    }
    await expect(page).toHaveURL(/\/jobs/)
  })
})

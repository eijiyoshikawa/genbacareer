import { test, expect } from "@playwright/test"

test.describe("Error pages", () => {
  test("存在しない URL で 404 ページが表示される", async ({ page }) => {
    // Next.js 15 App Router の notFound() は HTTP 200 を返し
    // not-found.tsx を render する仕様。status code ではなく content で判定。
    await page.goto("/this-route-definitely-does-not-exist-12345")

    // 404 表示
    await expect(page.getByText("404 NOT FOUND")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "ページが見つかりません" })
    ).toBeVisible()

    // 人気カテゴリの導線が出る（建築 / 土木 / ドライバー 等）
    await expect(page.getByRole("link", { name: /建築/ }).first()).toBeVisible()
    await expect(page.getByRole("link", { name: /ドライバー/ }).first()).toBeVisible()
  })

  test("404 ページは noindex メタを持つ", async ({ page }) => {
    await page.goto("/this-route-also-does-not-exist-99999")
    // metadata.robots = { index: false } が <meta name="robots" content="noindex"> として出る。
    // ルートレイアウトの "index, follow" もマッチするため、noindex を持つものが少なくとも 1 つあることを確認する。
    const contents = await page
      .locator('meta[name="robots"]')
      .evaluateAll((nodes) =>
        nodes.map((n) => n.getAttribute("content") ?? ""),
      )
    expect(contents.some((c) => /noindex/i.test(c))).toBe(true)
  })
})

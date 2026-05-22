import { test, expect } from "@playwright/test"

test.describe("SEO / 構造化データ", () => {
  test("ホームページに Organization と WebSite の JSON-LD が含まれる", async ({
    page,
  }) => {
    await page.goto("/")
    const scripts = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents()

    expect(scripts.length).toBeGreaterThan(0)
    const joined = scripts.join("\n")
    expect(joined).toContain("Organization")
    expect(joined).toContain("WebSite")
    expect(joined).toContain("ゲンバキャリア")
  })

  test("求人一覧ページがメタデータを持つ", async ({ page }) => {
    await page.goto("/jobs")
    const ogTitle = await page
      .locator('meta[property="og:title"]')
      .getAttribute("content")
    expect(ogTitle).toBeTruthy()
  })
})

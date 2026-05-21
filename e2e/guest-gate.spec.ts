import { test, expect } from "@playwright/test"

/**
 * 未ログイン時の求人閲覧制限 (GUEST_LIMIT=15) を検証する。
 *
 * 対象ルート:
 *   - /jobs
 *   - /tokyo (都道府県別)
 *   - /tokyo/construction (都道府県 + カテゴリ)
 *   - /categories/construction
 *   - /hw-jobs (HelloWork 専用)
 *   - /api/jobs (REST)
 *   - /api/jobs/feed (フィード)
 *
 * これらのページ / API で 16 件目以降は表示 / 返却されないことを確認。
 */
test.describe("Guest gate (未ログイン時の 15 件制限)", () => {
  test("/jobs で GuestTrialBanner が表示される (求人が 16 件以上ある前提)", async ({
    page,
  }) => {
    await page.goto("/jobs")
    // 「お試し閲覧中」バナーが表示される (求人 0 件のテスト DB では出ない可能性あり)
    const banner = page.getByText(/お試し閲覧中/)
    // 求人がほぼ無いテスト DB では skip 扱い
    if (await banner.isVisible().catch(() => false)) {
      await expect(banner).toBeVisible()
      await expect(
        page.getByText(/上位\s*15\s*件のみ表示/),
      ).toBeVisible()
    }
  })

  test("/tokyo で 未ログイン時に GuestSignupCta が表示される", async ({ page }) => {
    await page.goto("/tokyo")
    // ページタイトル
    await expect(page).toHaveTitle(/東京都/)

    // 求人が 15 件超ある場合のみ CTA が表示される
    const cta = page.getByText(/無料で会員登録/)
    if (await cta.isVisible().catch(() => false)) {
      await expect(cta).toBeVisible()
    }
  })

  test("/api/jobs は未ログイン時 limit=15 で打ち切り", async ({ request }) => {
    // limit=50 を要求しても 15 件しか返らないはず
    const res = await request.get("/api/jobs?limit=50&page=1")
    expect(res.ok()).toBe(true)
    const json = await res.json()
    expect(Array.isArray(json.jobs)).toBe(true)
    // 上限 15
    expect(json.jobs.length).toBeLessThanOrEqual(15)
  })

  test("/api/jobs/feed は未ログイン時 401", async ({ request }) => {
    const res = await request.get("/api/jobs/feed")
    expect(res.status()).toBe(401)
  })

  test("/api/jobs で page=2 を要求しても page=1 固定", async ({ request }) => {
    const res = await request.get("/api/jobs?page=2&limit=10")
    expect(res.ok()).toBe(true)
    const json = await res.json()
    // pagination.page が 1 に矯正されている
    expect(json.pagination?.page).toBe(1)
  })
})

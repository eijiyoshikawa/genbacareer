import { test, expect } from "@playwright/test"

/**
 * 認証ゲート: 未ログインで保護ルートに到達したらログインへリダイレクト or 401。
 *
 * 検証対象:
 *   - 求職者領域 /mypage/*
 *   - 企業領域 /company/*
 *   - admin 領域 /admin/*
 */
test.describe("Auth gates (未認証でのアクセス制御)", () => {
  // 求職者領域
  for (const path of [
    "/mypage",
    "/mypage/applications",
    "/mypage/scouts",
    "/mypage/profile",
    "/mypage/notifications",
    "/mypage/notifications/settings",
    "/mypage/saved-searches",
    "/mypage/favorites",
  ]) {
    test(`未ログインで ${path} → /login にリダイレクト`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  // 企業領域
  for (const path of [
    "/company/dashboard",
    "/company/jobs",
    "/company/applications",
    "/company/interests",
    "/company/scouts",
    "/company/billing",
  ]) {
    test(`未ログインで ${path} → /login にリダイレクト`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }

  // admin 領域 (最低限の一覧画面)
  for (const path of [
    "/admin",
    "/admin/companies",
    "/admin/billing-todo",
    "/admin/early-resignations",
    "/admin/hiring-bonuses",
  ]) {
    test(`非 admin で ${path} → /login にリダイレクト`, async ({ page }) => {
      await page.goto(path)
      await expect(page).toHaveURL(/\/login/)
    })
  }
})

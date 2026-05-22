import { defineConfig, devices } from "@playwright/test"

/**
 * Playwright E2E テスト設定。
 *
 * 実行方法:
 *   pnpm dev               # 別ターミナルで Next.js dev サーバを起動
 *   pnpm test:e2e          # 全テスト
 *   pnpm test:e2e:ui       # UI モード（ステップ確認）
 *
 * CI / 別ホストで実行する場合:
 *   PLAYWRIGHT_BASE_URL=https://staging.genbacareer.jp pnpm test:e2e
 */

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000"

export default defineConfig({
  testDir: "./e2e",
  // CI でのみ retries 有効化
  retries: process.env.CI ? 2 : 0,
  // CI では並列度を絞ってフレーキー回避
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // 実 UA をブラウザ既定にする（middleware の UA ブロックを通すため）
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 7"] },
    },
  ],
})

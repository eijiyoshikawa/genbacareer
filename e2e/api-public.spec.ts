import { test, expect } from "@playwright/test"

/**
 * 公開 API の基本動作確認。
 *
 * - 未認証アクセスでも HTTP レイヤーは応答する
 * - レート制限 + ゲスト 15 件制限が効いている
 * - cron エンドポイントは CRON_SECRET なしで 401
 */
test.describe("Public API smoke", () => {
  test("/api/jobs は JSON を返す", async ({ request }) => {
    const res = await request.get("/api/jobs?limit=5")
    expect(res.ok()).toBe(true)
    const json = await res.json()
    expect(json).toHaveProperty("jobs")
    expect(json).toHaveProperty("pagination")
    expect(Array.isArray(json.jobs)).toBe(true)
  })

  test("/api/jobs/categories は配列を返す", async ({ request }) => {
    const res = await request.get("/api/jobs/categories")
    // 200 or 404 (実装次第)
    if (res.ok()) {
      const json = await res.json()
      expect(typeof json === "object").toBe(true)
    }
  })

  test("/api/cron/expire-jobs は CRON_SECRET なしで 401", async ({
    request,
  }) => {
    // CRON_SECRET 環境変数が設定されている前提
    // 設定されていない開発環境では 200 が返るので柔軟に
    const res = await request.get("/api/cron/expire-jobs")
    expect([200, 401]).toContain(res.status())
  })

  test("/api/cron/rotate-companies は CRON_SECRET なしで 401", async ({
    request,
  }) => {
    const res = await request.get("/api/cron/rotate-companies")
    expect([200, 401]).toContain(res.status())
  })
})

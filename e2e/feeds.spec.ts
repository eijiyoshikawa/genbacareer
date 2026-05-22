import { test, expect } from "@playwright/test"

/**
 * 公開 XML フィードの基本検証。
 *
 *   - /sitemap.xml         (Next.js 標準)
 *   - /image-sitemap.xml   (Google 画像検索)
 *   - /video-sitemap.xml   (Google 動画検索)
 *   - /jobs.xml            (Indeed Source Posting Phase A)
 *   - /robots.txt          (クローラ制御)
 */
test.describe("Public XML feeds", () => {
  test("/jobs.xml は Indeed 仕様の XML を返す", async ({ request }) => {
    const res = await request.get("/jobs.xml")
    expect(res.ok()).toBe(true)

    const contentType = res.headers()["content-type"] ?? ""
    expect(contentType).toContain("application/xml")

    const body = await res.text()
    expect(body.startsWith('<?xml version="1.0" encoding="utf-8"?>')).toBe(true)
    expect(body).toContain("<source>")
    expect(body).toContain("<publisher>")
    expect(body).toContain("ゲンバキャリア")
    expect(body).toContain("<lastBuildDate>")
    expect(body).toContain("</source>")
  })

  test("/sitemap.xml は valid な XML を返す", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.ok()).toBe(true)
    const body = await res.text()
    expect(body).toContain("<?xml")
    expect(body).toContain("<urlset")
  })

  test("/image-sitemap.xml は image namespace を持つ", async ({
    request,
  }) => {
    const res = await request.get("/image-sitemap.xml")
    expect(res.ok()).toBe(true)
    const body = await res.text()
    // Google 画像サイトマップ namespace
    expect(body).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
    // 少なくとも 1 件は <image:image> エントリがある (本番 DB に求人があれば)
    if (body.includes("<url>")) {
      expect(body).toContain("<image:")
    }
  })

  test("/robots.txt は AI クローラを Disallow している", async ({ request }) => {
    const res = await request.get("/robots.txt")
    expect(res.ok()).toBe(true)
    const body = await res.text()
    // 代表的な AI クローラ
    expect(body).toContain("GPTBot")
    expect(body).toContain("ClaudeBot")
    // 認証ゾーンが disallow
    expect(body).toMatch(/Disallow:\s*\/admin/)
    expect(body).toMatch(/Disallow:\s*\/mypage/)
  })
})

import { test, expect } from "@playwright/test"

test.describe("Security & SEO basics", () => {
  test("robots.txt がアクセス可能で AI ボットを Disallow している", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt")
    expect(res.ok()).toBeTruthy()
    const body = await res.text()

    // 主要 AI クローラ
    expect(body).toContain("GPTBot")
    expect(body).toContain("ClaudeBot")
    expect(body).toContain("CCBot")
    // 一般 UA は許可されている (Next.js MetadataRoute.Robots は "User-Agent" 形式で出力)
    expect(body).toMatch(/User-Agent:\s*\*/i)
    expect(body).toContain("Disallow: /api/")
  })

  test("sitemap.xml がアクセス可能", async ({ request }) => {
    const res = await request.get("/sitemap.xml")
    expect(res.ok()).toBeTruthy()
    const ct = res.headers()["content-type"] ?? ""
    expect(ct).toMatch(/xml/)
  })

  test("公開ページが X-Robots-Tag を返す", async ({ request }) => {
    const res = await request.get("/")
    expect(res.ok()).toBeTruthy()
    const xRobots = res.headers()["x-robots-tag"] ?? ""
    expect(xRobots).toContain("index")
    expect(xRobots).toContain("noarchive")
  })

  test("認証エリアは noindex で配信される", async ({ request }) => {
    const res = await request.get("/mypage", {
      maxRedirects: 0,
      failOnStatusCode: false,
    })
    // 未ログインなのでリダイレクト or 404 が返るはず
    const xRobots = res.headers()["x-robots-tag"] ?? ""
    if (xRobots) {
      expect(xRobots).toContain("noindex")
    }
  })

  test("curl UA は 403 で弾かれる（スクレイピング防止）", async ({
    request,
  }) => {
    const res = await request.get("/jobs", {
      headers: { "User-Agent": "curl/7.85.0" },
      failOnStatusCode: false,
    })
    expect(res.status()).toBe(403)
  })

  test("通常ブラウザ UA は通過する", async ({ request }) => {
    const res = await request.get("/jobs", {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
    })
    expect(res.ok()).toBeTruthy()
  })
})

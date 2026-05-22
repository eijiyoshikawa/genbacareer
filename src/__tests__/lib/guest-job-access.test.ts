import { describe, it, expect } from "vitest"
import { isCrawlerUserAgent, GUEST_LIMIT } from "@/lib/guest-job-access"

describe("isCrawlerUserAgent", () => {
  it("returns true for major search engine bots", () => {
    const uas = [
      "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
      "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; Google-Extended)",
      "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
      "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)",
      "DuckDuckBot/1.1; (+http://duckduckgo.com/duckduckbot.html)",
      "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)",
      "Mozilla/5.0 (compatible; Baiduspider/2.0; +http://www.baidu.com/search/spider.html)",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15 (Applebot/0.1)",
    ]
    for (const ua of uas) {
      expect(isCrawlerUserAgent(ua), `should match: ${ua}`).toBe(true)
    }
  })

  it("returns true for SNS crawlers (OGP fetchers)", () => {
    expect(
      isCrawlerUserAgent(
        "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)"
      )
    ).toBe(true)
    expect(isCrawlerUserAgent("Twitterbot/1.0")).toBe(true)
    expect(
      isCrawlerUserAgent(
        "LinkedInBot/1.0 (compatible; Mozilla/5.0; +https://www.linkedin.com)"
      )
    ).toBe(true)
  })

  it("returns false for typical end-user browsers", () => {
    const uas = [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
    ]
    for (const ua of uas) {
      expect(isCrawlerUserAgent(ua), `should NOT match: ${ua}`).toBe(false)
    }
  })

  it("returns false for empty/null/undefined", () => {
    expect(isCrawlerUserAgent(null)).toBe(false)
    expect(isCrawlerUserAgent(undefined)).toBe(false)
    expect(isCrawlerUserAgent("")).toBe(false)
  })
})

describe("GUEST_LIMIT", () => {
  it("is 15 (お試し検索 仕様)", () => {
    expect(GUEST_LIMIT).toBe(15)
  })
})

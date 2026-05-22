import type { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

/**
 * AI 学習・商用データ収集系のクローラを Disallow。
 * Google / Bing / Yahoo 等の正規 SE は対象外（通常通り通す）。
 *
 * 一覧の出典:
 *   - OpenAI: https://platform.openai.com/docs/gptbot
 *   - Anthropic: https://support.anthropic.com/en/articles/8896518
 *   - Common Crawl: https://commoncrawl.org/big-picture/frequently-asked-questions/
 *   - Perplexity: https://docs.perplexity.ai/guides/bots
 */
const AI_AND_SCRAPER_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended", // Google Bard / Gemini 学習用（検索用 Googlebot とは別）
  "CCBot",
  "PerplexityBot",
  "Perplexity-User",
  "Amazonbot",
  "Applebot-Extended",
  "FacebookBot",
  "Bytespider", // TikTok 親会社の AI クローラ
  "Diffbot",
  "Omgilibot",
  "ImagesiftBot",
  "DataForSeoBot",
  "AhrefsBot",
  "SemrushBot",
  "DotBot",
  "MJ12bot",
  "PetalBot",
  "TimpiBot",
  "magpie-crawler",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // 1) 全 UA: 公開ページのみ許可、認証ゾーンと API は Disallow
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/mypage/", "/company/", "/admin/", "/liff/"],
      },
      // 2) AI 学習・商用データ収集ボット: 全 Disallow
      ...AI_AND_SCRAPER_BOTS.map((userAgent) => ({
        userAgent,
        disallow: "/",
      })),
    ],
    sitemap: [
      `${BASE_URL}/sitemap.xml`,
      `${BASE_URL}/image-sitemap.xml`,
      `${BASE_URL}/video-sitemap.xml`,
    ],
    host: BASE_URL,
  }
}

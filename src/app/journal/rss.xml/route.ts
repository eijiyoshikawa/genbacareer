import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"

/**
 * マガジンの RSS 2.0 フィード。
 *
 * - Path: /journal/rss.xml
 * - 直近 50 件
 * - サイト全体 (カテゴリ別フィードはまだ提供しない)
 *
 * 検索エンジン以外の購読者 (Feedly, NetNewsWire 等) からの流入経路を作る。
 * Google Discover / Bing News の補助シグナルにもなる。
 */

export const revalidate = 3600

const SITE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export async function GET() {
  const articles = await prisma.article
    .findMany({
      where: publishedArticleFilter(),
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        metaDescription: true,
        publishedAt: true,
        updatedAt: true,
        authorName: true,
        category: true,
        imageUrl: true,
      },
    })
    .catch(() => [])

  const items = articles
    .map((a) => {
      const url = `${SITE_URL}/journal/${a.slug}`
      const desc = a.metaDescription ?? a.excerpt ?? a.title
      const pubDate = (a.publishedAt ?? a.updatedAt).toUTCString()
      return [
        "  <item>",
        `    <title>${escapeXml(a.title)}</title>`,
        `    <link>${url}</link>`,
        `    <guid isPermaLink="true">${url}</guid>`,
        `    <description>${escapeXml(desc)}</description>`,
        `    <pubDate>${pubDate}</pubDate>`,
        `    <category>${escapeXml(a.category)}</category>`,
        `    <author>noreply@genbacareer.jp (${escapeXml(a.authorName)})</author>`,
        ...(a.imageUrl
          ? [
              `    <enclosure url="${escapeXml(a.imageUrl)}" type="image/jpeg" />`,
            ]
          : []),
        "  </item>",
      ].join("\n")
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>ゲンバキャリア マガジン</title>
  <link>${SITE_URL}/journal</link>
  <description>建設業界に特化した求人サイト ゲンバキャリアの編集部による、転職・キャリア・資格・年収・現場の働き方に関する記事フィードです。</description>
  <language>ja</language>
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
  <atom:link href="${SITE_URL}/journal/rss.xml" rel="self" type="application/rss+xml" />
${items}
</channel>
</rss>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
    },
  })
}

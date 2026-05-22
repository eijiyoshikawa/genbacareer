import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"

/**
 * Google 動画検索向け video sitemap。
 *
 * - sitemap 仕様: https://developers.google.com/search/docs/crawling-indexing/sitemaps/video-sitemaps
 * - 必須項目: <video:thumbnail_loc> <video:title> <video:description>
 * - 推奨項目: <video:content_loc> または <video:player_loc>
 *
 * 対象: videoUrls (text[]) を持つ active 建設業求人 (1 求人につき最大 3 動画)
 */

export const revalidate = 86400
// build 時 prerender でクエリが 60s timeout になると Vercel build 全体が落ちるため、
// 初回リクエスト時に動的生成して revalidate でキャッシュする方式に切替。
export const dynamic = "force-dynamic"

const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

// YouTube / TikTok / Vimeo URL → 埋め込み URL に正規化
function toPlayerUrl(url: string): string {
  try {
    const u = new URL(url)
    // YouTube watch?v=XXXX → embed/XXXX
    if (u.hostname.endsWith("youtube.com") && u.pathname === "/watch") {
      const v = u.searchParams.get("v")
      if (v) return `https://www.youtube.com/embed/${v}`
    }
    if (u.hostname === "youtu.be") {
      const v = u.pathname.replace(/^\//, "")
      return `https://www.youtube.com/embed/${v}`
    }
    // TikTok @user/video/XXXX → そのまま
    // Vimeo /XXXX → /XXXX (player URL は要 oEmbed)
  } catch {
    // ignore
  }
  return url
}

export async function GET() {
  const jobs = await prisma.job
    .findMany({
      where: {
        status: "active",
        category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
        // videoUrls には min 1 要素ある求人のみ
        NOT: { videoUrls: { isEmpty: true } },
      },
      select: {
        id: true,
        title: true,
        description: true,
        videoUrls: true,
        updatedAt: true,
        publishedAt: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 500,
    })
    .catch(() => [])

  const blocks: string[] = []

  for (const j of jobs) {
    const pageUrl = `${BASE_URL}/jobs/${j.id}`
    const thumbUrl = `${BASE_URL}/jobs/${j.id}/opengraph-image`
    const description =
      j.description && j.description.trim().length > 0
        ? j.description.slice(0, 280)
        : `${j.title} の紹介動画`

    for (const v of j.videoUrls.slice(0, 3)) {
      const playerUrl = toPlayerUrl(v)
      const publishDate = (j.publishedAt ?? j.updatedAt).toISOString()
      blocks.push(
        [
          "  <url>",
          `    <loc>${escapeXml(pageUrl)}</loc>`,
          "    <video:video>",
          `      <video:thumbnail_loc>${escapeXml(thumbUrl)}</video:thumbnail_loc>`,
          `      <video:title>${escapeXml(j.title)} の紹介動画</video:title>`,
          `      <video:description>${escapeXml(description)}</video:description>`,
          `      <video:player_loc>${escapeXml(playerUrl)}</video:player_loc>`,
          `      <video:publication_date>${publishDate}</video:publication_date>`,
          "      <video:family_friendly>yes</video:family_friendly>",
          "      <video:requires_subscription>no</video:requires_subscription>",
          "      <video:live>no</video:live>",
          "    </video:video>",
          "  </url>",
        ].join("\n"),
      )
    }
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:video="http://www.google.com/schemas/sitemap-video/1.1"
>
${blocks.join("\n")}
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=172800",
    },
  })
}

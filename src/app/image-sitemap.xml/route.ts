import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"

/**
 * Google 画像検索向けの image sitemap。
 *
 * - 各 URL ごとに <image:image><image:loc> を列挙
 * - sitemap 仕様: https://developers.google.com/search/docs/crawling-indexing/sitemaps/image-sitemaps
 *
 * 対象:
 *   1. 求人詳細ページ (/jobs/{id}) — 動的 OG 画像 + 会社ロゴ
 *   2. 企業詳細ページ (/companies/{id}) — ロゴ + 写真ギャラリー
 *   3. 記事詳細ページ (/journal/{slug}) — 動的 OG 画像 + ヒーロー画像
 *
 * 上限 1,000 URL (50,000 まで OK だが応答サイズと生成コストを抑える)。
 */

export const revalidate = 86400

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

type ImageEntry = {
  pageUrl: string
  images: Array<{ loc: string; caption?: string; title?: string }>
}

export async function GET() {
  const [jobs, companies, articles] = await Promise.all([
    prisma.job
      .findMany({
        where: {
          status: "active",
          category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
        },
        select: {
          id: true,
          title: true,
          company: { select: { name: true, logoUrl: true } },
        },
        orderBy: { updatedAt: "desc" },
        take: 500,
      })
      .catch(() => []),
    prisma.company
      .findMany({
        where: { status: "approved", source: "direct" },
        select: { id: true, name: true, logoUrl: true, photos: true },
        orderBy: { createdAt: "desc" },
        take: 300,
      })
      .catch(() => []),
    prisma.article
      .findMany({
        where: publishedArticleFilter(),
        select: { slug: true, title: true, imageUrl: true },
        orderBy: { publishedAt: "desc" },
        take: 200,
      })
      .catch(() => []),
  ])

  const entries: ImageEntry[] = []

  // 求人ページ
  for (const j of jobs) {
    const imgs: ImageEntry["images"] = []
    // 動的 OG 画像 (常に存在)
    imgs.push({
      loc: `${BASE_URL}/jobs/${j.id}/opengraph-image`,
      title: j.title,
    })
    // 会社ロゴ (あれば)
    if (j.company?.logoUrl) {
      imgs.push({
        loc: j.company.logoUrl,
        caption: `${j.company.name} のロゴ`,
      })
    }
    entries.push({
      pageUrl: `${BASE_URL}/jobs/${j.id}`,
      images: imgs,
    })
  }

  // 企業ページ
  for (const c of companies) {
    const imgs: ImageEntry["images"] = []
    imgs.push({
      loc: `${BASE_URL}/companies/${c.id}/opengraph-image`,
      title: c.name,
    })
    if (c.logoUrl) {
      imgs.push({
        loc: c.logoUrl,
        caption: `${c.name} のロゴ`,
      })
    }
    // 職場写真 (最大 5 件)
    for (const photo of c.photos.slice(0, 5)) {
      imgs.push({ loc: photo, caption: `${c.name} の職場` })
    }
    entries.push({
      pageUrl: `${BASE_URL}/companies/${c.id}`,
      images: imgs,
    })
  }

  // 記事ページ
  for (const a of articles) {
    const imgs: ImageEntry["images"] = []
    imgs.push({
      loc: `${BASE_URL}/journal/${a.slug}/opengraph-image`,
      title: a.title,
    })
    if (a.imageUrl) {
      imgs.push({ loc: a.imageUrl, title: a.title })
    }
    entries.push({
      pageUrl: `${BASE_URL}/journal/${a.slug}`,
      images: imgs,
    })
  }

  const urls = entries
    .map((entry) => {
      const imageBlocks = entry.images
        .map((img) =>
          [
            "    <image:image>",
            `      <image:loc>${escapeXml(img.loc)}</image:loc>`,
            ...(img.title
              ? [`      <image:title>${escapeXml(img.title)}</image:title>`]
              : []),
            ...(img.caption
              ? [`      <image:caption>${escapeXml(img.caption)}</image:caption>`]
              : []),
            "    </image:image>",
          ].join("\n"),
        )
        .join("\n")
      return [
        "  <url>",
        `    <loc>${escapeXml(entry.pageUrl)}</loc>`,
        imageBlocks,
        "  </url>",
      ].join("\n")
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
>
${urls}
</urlset>`

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=172800",
    },
  })
}

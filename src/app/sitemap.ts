import type { MetadataRoute } from "next"
import { prisma } from "@/lib/db"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"
import { publishedArticleFilter } from "@/lib/articles"

// Vercel ビルド時の prerender をスキップしてリクエスト時生成に切り替える。
// 多数の Prisma クエリ (Job 5000 + Company 2000 + SeoPage 5000 + Article 2000) を
// 抱えており、ビルドフェーズで 60s タイムアウトしてデプロイ失敗するため。
// dynamic = "force-dynamic" 指定で revalidate は無視されるが、将来 fetchCache 等で
// 部分キャッシュ運用したいときの目安として 1 時間を残しておく。
export const dynamic = "force-dynamic"
export const revalidate = 3600

// Google の sitemap 上限は 50,000 URL / 50 MB。
// 求人系の URL は更新頻度の高い直近分のみ載せ、それ以外は静的 LP に任せる。
const MAX_JOBS = 5000
const MAX_SEO_COMBOS = 5000
const MAX_COMPANIES = 2000

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://genbacareer.jp"

async function safeFindMany<T>(label: string, fn: () => Promise<T[]>): Promise<T[]> {
  try {
    return await fn()
  } catch (e) {
    console.error(`[sitemap] ${label} failed:`, e instanceof Error ? e.message : e)
    return []
  }
}

const journalSlugs = [
  "construction-career-guide",
  "tobi-salary",
  "electrician-license",
  "construction-manager-role",
  "civil-engineering-career",
  "construction-safety",
  "interior-finishing-guide",
  "demolition-work",
]

// 都道府県スラッグ（src/app/[prefecture]/page.tsx と同じセット）
const PREFECTURE_SLUGS = [
  "hokkaido", "aomori", "iwate", "miyagi", "akita", "yamagata", "fukushima",
  "ibaraki", "tochigi", "gunma", "saitama", "chiba", "tokyo", "kanagawa",
  "niigata", "toyama", "ishikawa", "fukui", "yamanashi", "nagano",
  "gifu", "shizuoka", "aichi", "mie",
  "shiga", "kyoto", "osaka", "hyogo", "nara", "wakayama",
  "tottori", "shimane", "okayama", "hiroshima", "yamaguchi",
  "tokushima", "kagawa", "ehime", "kochi",
  "fukuoka", "saga", "nagasaki", "kumamoto", "oita", "miyazaki", "kagoshima", "okinawa",
]

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/jobs`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/hw-jobs`,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/journal`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/help`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/help/seeker`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/help/employer`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${BASE_URL}/for-employers`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/legal`,
      lastModified: new Date(),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/faq`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ]

  // Journal articles
  const journalPages: MetadataRoute.Sitemap = journalSlugs.map((slug) => ({
    url: `${BASE_URL}/journal/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }))

  // Active job detail pages（建設業カテゴリのみ、更新順 上位 5,000 件）
  const jobs = await safeFindMany("jobs", () =>
    prisma.job.findMany({
      where: {
        status: "active",
        category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
      },
      select: { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_JOBS,
    })
  )

  const jobPages: MetadataRoute.Sitemap = jobs.map((job) => ({
    url: `${BASE_URL}/jobs/${job.id}`,
    lastModified: job.updatedAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  // Prefecture-only landing pages（/[prefecture]/page.tsx に対応）
  const prefecturePages: MetadataRoute.Sitemap = PREFECTURE_SLUGS.map(
    (slug) => ({
      url: `${BASE_URL}/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.85,
    })
  )

  // National category landing pages（/categories/[category]/page.tsx に対応）
  const categoryPages: MetadataRoute.Sitemap = CONSTRUCTION_CATEGORY_VALUES.map(
    (slug) => ({
      url: `${BASE_URL}/categories/${slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.85,
    })
  )

  // Prefecture x category SEO landing pages (上限あり)
  const seoPages = await safeFindMany("seoPages", () =>
    prisma.seoPage.findMany({
      select: { prefecture: true, category: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: MAX_SEO_COMBOS,
    })
  )

  const seoCombos: MetadataRoute.Sitemap = seoPages.map((page) => ({
    url: `${BASE_URL}/${page.prefecture}/${page.category}`,
    lastModified: page.updatedAt,
    changeFrequency: "daily" as const,
    priority: 0.8,
  }))

  // 公開されている直接掲載企業の詳細ページ (上限あり)
  const companies = await safeFindMany("companies", () =>
    prisma.company.findMany({
      where: { status: "approved", source: "direct" },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: MAX_COMPANIES,
    })
  )

  const companyPages: MetadataRoute.Sitemap = companies.map((c) => ({
    url: `${BASE_URL}/companies/${c.id}`,
    lastModified: c.createdAt,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }))

  // 公開済みヘルプ記事を sitemap に追加（未来日付の記事は除外）
  const helpArticles = await safeFindMany("helpArticles", () =>
    prisma.article.findMany({
      where: {
        ...publishedArticleFilter(),
        category: { in: ["help-seeker", "help-employer"] },
      },
      select: { slug: true, category: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 2000,
    })
  )

  const helpPages: MetadataRoute.Sitemap = helpArticles.map((a) => {
    const audience = a.category === "help-seeker" ? "seeker" : "employer"
    return {
      url: `${BASE_URL}/help/${audience}/${a.slug}`,
      lastModified: a.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    }
  })

  return [
    ...staticPages,
    ...journalPages,
    ...prefecturePages,
    ...categoryPages,
    ...jobPages,
    ...seoCombos,
    ...companyPages,
    ...helpPages,
  ]
}

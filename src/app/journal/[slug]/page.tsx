import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { ChevronRight } from "lucide-react"
import type { Metadata } from "next"
import { trackEvent } from "@/lib/track"
import { ShareButtons } from "@/components/journal/share-buttons"
import { JobCard } from "@/components/jobs/job-card"
import { CATEGORIES } from "@/lib/categories"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

// 記事詳細は 1 時間単位の ISR で十分（更新頻度低）。
export const revalidate = 3600

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const article = await prisma.article.findFirst({
    where: { slug, ...publishedArticleFilter() },
    select: { title: true, metaDescription: true, excerpt: true },
  })
  if (!article) return { title: "記事が見つかりません" }
  return {
    title: article.title,
    description: article.metaDescription ?? article.excerpt ?? undefined,
    alternates: { canonical: `/journal/${slug}` },
  }
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params
  const article = await prisma.article.findFirst({
    where: { slug, ...publishedArticleFilter() },
  })

  if (!article) notFound()

  // Increment view count (non-blocking)
  prisma.article.update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } }).catch(() => {})

  // 13.4 trackEvent("view_article")
  void trackEvent({
    name: "view_article",
    payload: {
      articleId: article.id,
      slug: article.slug,
      category: article.category,
      subcategory: article.subcategory,
    },
  })

  // 関連求人 CTA: subcategory が CATEGORIES.value に該当すればその category の active 求人 3 件
  const subcategoryIsCategory = CATEGORIES.some((c) => c.value === article.subcategory)
  const relatedJobs = subcategoryIsCategory
    ? await prisma.job
        .findMany({
          where: { status: "active", category: article.subcategory! },
          orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
          take: 3,
          select: {
            id: true,
            title: true,
            category: true,
            employmentType: true,
            salaryMin: true,
            salaryMax: true,
            salaryType: true,
            prefecture: true,
            city: true,
            source: true,
            tags: true,
            company: { select: { name: true, logoUrl: true, gbizData: true } },
          },
        })
        .catch(() => [])
    : []

  // Fetch related articles (same category, excluding current)
  const related = await prisma.article.findMany({
    where: {
      ...publishedArticleFilter(),
      category: article.category,
      id: { not: article.id },
    },
    select: { slug: true, title: true, publishedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 5,
  })

  // JSON-LD: Article schema for SEO (13.1)
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt ?? article.metaDescription ?? undefined,
    image: article.imageUrl ? [article.imageUrl] : undefined,
    datePublished: article.publishedAt?.toISOString(),
    dateModified: article.updatedAt.toISOString(),
    author: { "@type": "Organization", name: article.authorName },
    publisher: {
      "@type": "Organization",
      name: "ゲンバキャリア",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/logo-demo.jpg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": `${SITE_URL}/journal/${article.slug}` },
  }

  const categoryLabels: Record<string, string> = {
    career: "転職・キャリア",
    salary: "年収・給与",
    license: "資格・免許",
    "job-type": "職種解説",
    industry: "業界知識",
    interview: "体験談",
  }

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Breadcrumb */}
      <div className="border-b">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-1 text-xs text-gray-500">
            <Link href="/" className="hover:text-primary-600">トップ</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/journal" className="hover:text-primary-600">マガジン</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/journal?category=${article.category}`} className="hover:text-primary-600">
              {categoryLabels[article.category] ?? article.category}
            </Link>
          </nav>
        </div>
      </div>

      <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex items-center gap-2">
          <span className="bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
            {categoryLabels[article.category] ?? article.category}
          </span>
          {article.publishedAt && (
            <time className="text-xs text-gray-400" dateTime={article.publishedAt.toISOString()}>
              {article.publishedAt.toLocaleDateString("ja-JP")}
            </time>
          )}
        </div>

        <h1 className="mt-3 text-2xl font-bold text-gray-900 leading-tight">
          {article.title}
        </h1>

        <div className="mt-2 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-xs text-gray-500">
            {article.authorName}
          </p>
          <ShareButtons
            url={`${SITE_URL}/journal/${article.slug}`}
            title={article.title}
            articleId={article.id}
          />
        </div>

        {/* Top CTA */}
        <div className="mt-6">
          <Link
            href="/jobs"
            className="flex w-full items-center justify-center gap-2 bg-red-500 py-3 text-sm font-bold text-white hover:bg-red-600 transition"
          >
            求人を探す
          </Link>
        </div>

        {/* Article body (HTML) */}
        <div
          className="article-body mt-8"
          dangerouslySetInnerHTML={{ __html: article.body }}
        />

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="mt-8 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <span key={tag} className="border border-gray-200 px-2.5 py-1 text-xs text-gray-500">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Bottom share */}
        <div className="mt-8 flex justify-end">
          <ShareButtons
            url={`${SITE_URL}/journal/${article.slug}`}
            title={article.title}
            articleId={article.id}
          />
        </div>

        {/* 関連求人 CTA (13.1 ブログ → 求人へ回遊) */}
        {relatedJobs.length > 0 && (
          <section className="mt-10">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2">
              この記事に関連する求人
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {relatedJobs.map((job) => (
                <JobCard key={job.id} job={job} />
              ))}
            </div>
          </section>
        )}

        {/* Bottom CTA */}
        <div className="mt-10  bg-primary-50 border border-primary-100 p-6 text-center">
          <p className="font-bold text-gray-900">建設業界の求人を探す</p>
          <p className="mt-1 text-sm text-gray-600">
            建設求人ポータルで、あなたに合った求人を見つけましょう。
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href="/jobs" className="bg-primary-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-primary-700">
              求人を検索する
            </Link>
            <Link href="/register" className="border border-gray-300 px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              無料会員登録
            </Link>
          </div>
        </div>

        {/* Related articles */}
        {related.length > 0 && (
          <div className="mt-10">
            <h2 className="text-base font-bold text-gray-900 border-b pb-2">関連記事</h2>
            <ul className="mt-3 space-y-2">
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/journal/${r.slug}`} className="flex items-start gap-2 text-sm text-gray-700 hover:text-primary-600">
                    <ChevronRight className="h-4 w-4 shrink-0 mt-0.5 text-gray-300" />
                    {r.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 text-center">
          <Link href="/journal" className="text-sm text-primary-600 hover:underline">
            ← マガジン一覧に戻る
          </Link>
        </div>
      </article>
    </div>
  )
}

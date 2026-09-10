import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { publishedMagazineArticleFilter } from "@/lib/articles"
import { AUTHORS, getAuthorBySlug } from "@/lib/authors"
import { CATEGORY_LABELS } from "@/lib/article-categories"
import {
  generatePersonSchema,
  generateBreadcrumbSchema,
  generateItemListSchema,
} from "@/lib/structured-data"
import {
  Buildings,
  Certificate,
  Briefcase,
  ArrowRight,
  CalendarBlank,
} from "@phosphor-icons/react/dist/ssr"

// 著者数が少ない (3 人) ので全パスを SSG。新規追加時は ISR でも吸収可能。
export const dynamicParams = false
export const revalidate = 21600 // 6 hours

export function generateStaticParams() {
  return AUTHORS.map((a) => ({ slug: a.slug }))
}

type Props = {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const author = getAuthorBySlug(slug)
  if (!author) return { title: "著者が見つかりません" }
  return {
    title: `${author.name} | ${author.role}`,
    description: author.bio,
    alternates: { canonical: `/authors/${author.slug}` },
    openGraph: {
      type: "profile",
      title: `${author.name} | ${author.role}`,
      description: author.bio,
      url: `/authors/${author.slug}`,
    },
  }
}

export default async function AuthorPage({ params }: Props) {
  const { slug } = await params
  const author = getAuthorBySlug(slug)
  if (!author) notFound()

  // この著者の記事一覧 (authorName 一致)
  const articles = await prisma.article
    .findMany({
      where: {
        ...publishedMagazineArticleFilter(),
        authorName: author.name,
      },
      orderBy: { publishedAt: "desc" },
      take: 30,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        imageUrl: true,
      },
    })
    .catch(() => [])

  const personJsonLd = generatePersonSchema({
    slug: author.slug,
    name: author.name,
    role: author.role,
    bio: author.longBio,
    qualifications: author.qualifications,
    expertise: author.expertise,
    photoUrl: author.photoUrl,
    sameAs: author.sameAs,
  })

  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "編集部・著者紹介", url: "/authors" },
    { name: author.name, url: `/authors/${author.slug}` },
  ])

  const itemList =
    articles.length > 0
      ? generateItemListSchema(
          articles.map((a) => ({
            url: `/journal/${a.slug}`,
            name: a.title,
          })),
          { itemListName: `${author.name} が執筆した記事一覧` },
        )
      : null

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {itemList && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
        />
      )}

      {/* === ヘッダー === */}
      <header className="border-b bg-warm-50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <nav className="text-xs text-gray-500 mb-3">
            <Link href="/" className="hover:text-primary-600">
              トップ
            </Link>
            <span className="mx-1">/</span>
            <Link href="/authors" className="hover:text-primary-600">
              編集部・著者紹介
            </Link>
            <span className="mx-1">/</span>
            <span>{author.name}</span>
          </nav>

          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center bg-primary-50">
              <Buildings className="h-10 w-10 sm:h-12 sm:w-12 text-primary-500" weight="duotone" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-primary-600 tracking-wide">AUTHOR</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-gray-900">
                {author.name}
              </h1>
              <p className="mt-1 text-sm font-bold text-primary-700">
                {author.role}
              </p>
              <p className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                <Briefcase weight="duotone" className="h-3.5 w-3.5" />
                建設業界 {author.yearsOfExperience} 年以上の実務経験
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* === プロフィール本文 === */}
      <section className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <article className="min-w-0 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-gray-900 section-bar">
            プロフィール
          </h2>
          <div className="text-sm sm:text-[15px] text-gray-800 leading-relaxed whitespace-pre-line">
            {author.longBio}
          </div>
        </article>

        <aside className="space-y-4">
          {author.qualifications.length > 0 && (
            <div className="card p-4">
              <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900">
                <Certificate weight="duotone" className="h-4 w-4 text-emerald-600" />
                保有資格
              </h3>
              <ul className="mt-2 space-y-1.5">
                {author.qualifications.map((q) => (
                  <li
                    key={q}
                    className="text-xs text-gray-700 leading-snug border-l-2 border-emerald-400 pl-2"
                  >
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {author.expertise.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-bold text-gray-900">専門領域</h3>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {author.expertise.map((e) => (
                  <li
                    key={e}
                    className="inline-flex items-center bg-primary-50 text-primary-700 text-[11px] font-bold px-2 py-0.5"
                  >
                    {e}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </section>

      {/* === 執筆記事一覧 === */}
      {articles.length > 0 && (
        <section className="border-t bg-warm-50">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-8">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 section-bar">
              {author.name} が執筆した記事
              <span className="ml-2 text-xs font-normal text-gray-500">
                {articles.length} 件
              </span>
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {articles.map((a) => (
                <li key={a.slug}>
                  <Link
                    href={`/journal/${a.slug}`}
                    className="press card group flex gap-3 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="inline-block text-[10px] font-bold text-primary-600 uppercase tracking-wide">
                        {CATEGORY_LABELS[a.category] ?? a.category}
                      </p>
                      <p className="mt-1 text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-primary-700 leading-snug">
                        {a.title}
                      </p>
                      {a.publishedAt && (
                        <p className="mt-1.5 flex items-center gap-1 text-[10px] text-gray-400">
                          <CalendarBlank weight="duotone" className="h-3 w-3" />
                          {new Date(a.publishedAt).toLocaleDateString("ja-JP")}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* === 編集ポリシーリンク === */}
      <section className="border-t">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 py-6 flex items-center justify-between gap-3">
          <p className="text-xs text-gray-600">
            記事の品質基準・出典の扱い・利益相反の管理について
          </p>
          <Link
            href="/editorial-policy"
            className="press inline-flex items-center gap-1 text-sm font-bold text-primary-600 hover:text-primary-700"
          >
            編集ポリシー
            <ArrowRight weight="bold" className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </div>
  )
}

import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { CATEGORY_LABELS } from "@/lib/article-categories"
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
  toJsonLdScript,
} from "@/lib/structured-data"

export const revalidate = 21600 // 6 hours

type Props = {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  const tagLabel = decodeURIComponent(tag)
  return {
    title: `「${tagLabel}」のマガジン記事一覧`,
    description: `建設業界の求人サイト ゲンバキャリアの「${tagLabel}」タグが付いた記事一覧。転職・キャリア・資格・年収などの関連トピックを集約しています。`,
    alternates: { canonical: `/tags/${tag}` },
    openGraph: {
      type: "website",
      title: `「${tagLabel}」のマガジン記事一覧`,
      description: `「${tagLabel}」に関する建設業界キャリア記事のまとめ`,
      url: `/tags/${tag}`,
    },
  }
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params
  const tagLabel = decodeURIComponent(tag)

  // タグ部分一致 (Prisma の has で配列要素完全一致)
  const articles = await prisma.article
    .findMany({
      where: {
        ...publishedArticleFilter(),
        tags: { has: tagLabel },
      },
      orderBy: { publishedAt: "desc" },
      take: 50,
      select: {
        slug: true,
        title: true,
        excerpt: true,
        category: true,
        publishedAt: true,
        imageUrl: true,
        authorName: true,
      },
    })
    .catch(() => [])

  if (articles.length === 0) {
    // 該当タグが存在しなければ 404
    notFound()
  }

  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "マガジン", url: "/journal" },
    { name: `タグ: ${tagLabel}`, url: `/tags/${tag}` },
  ])

  const collectionPage = generateCollectionPageSchema({
    url: `/tags/${tag}`,
    name: `「${tagLabel}」のマガジン記事一覧`,
    description: `「${tagLabel}」に関する建設業界キャリア記事のまとめ`,
    numberOfItems: articles.length,
  })

  const itemList = generateItemListSchema(
    articles.map((a) => ({
      url: `/journal/${a.slug}`,
      name: a.title,
    })),
    { itemListName: `「${tagLabel}」のマガジン記事一覧` },
  )

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(collectionPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(itemList) }}
      />

      <header className="border-b bg-warm-50">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-primary-600">トップ</Link>
            <span className="mx-1">/</span>
            <Link href="/journal" className="hover:text-primary-600">マガジン</Link>
            <span className="mx-1">/</span>
            <span>タグ</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            <span className="text-primary-600">#</span>
            {tagLabel}
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            {articles.length} 件の記事
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-8 space-y-4">
        {articles.map((a) => (
          <Link
            key={a.slug}
            href={`/journal/${a.slug}`}
            className="press card group flex gap-3 sm:gap-4 p-4"
          >
            {a.imageUrl && (
              <div className="relative h-20 w-28 sm:h-24 sm:w-36 shrink-0 overflow-hidden bg-gray-100">
                <Image
                  src={a.imageUrl}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 112px, 144px"
                  className="object-cover"
                  unoptimized={
                    !a.imageUrl.startsWith("/") &&
                    !a.imageUrl.includes("supabase.co")
                  }
                />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <span className="inline-block text-[10px] font-bold text-primary-600 uppercase tracking-wide">
                {CATEGORY_LABELS[a.category] ?? a.category}
              </span>
              <h2 className="mt-1 text-sm sm:text-base font-bold text-gray-900 line-clamp-2 group-hover:text-primary-700 leading-snug">
                {a.title}
              </h2>
              {a.excerpt && (
                <p className="mt-1 text-xs text-gray-500 line-clamp-2 leading-relaxed">
                  {a.excerpt}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2 text-[11px] text-gray-400">
                <span>{a.authorName}</span>
                {a.publishedAt && (
                  <>
                    <span>·</span>
                    <time dateTime={a.publishedAt.toISOString()}>
                      {a.publishedAt.toLocaleDateString("ja-JP")}
                    </time>
                  </>
                )}
              </div>
            </div>
          </Link>
        ))}
      </section>
    </div>
  )
}

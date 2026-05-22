import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight, ChevronLeft } from "lucide-react"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { getHelpSections, helpCategory } from "@/lib/help-articles"

export const revalidate = 3600

const AUDIENCE_LABELS = {
  seeker: "求職者向けマニュアル",
  employer: "求人掲載側マニュアル",
} as const

type Props = {
  params: Promise<{ audience: string; slug: string }>
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { audience, slug } = await params
  if (audience !== "seeker" && audience !== "employer") {
    return { title: "ページが見つかりません" }
  }

  const article = await prisma.article.findFirst({
    where: { slug, ...publishedArticleFilter() },
    select: {
      title: true,
      metaDescription: true,
      excerpt: true,
      category: true,
    },
  })

  if (!article || article.category !== helpCategory(audience)) {
    return { title: "ページが見つかりません" }
  }

  return {
    title: `${article.title} | ${AUDIENCE_LABELS[audience]}`,
    description:
      article.metaDescription ?? article.excerpt ?? undefined,
  }
}

export default async function HelpArticlePage({ params }: Props) {
  const { audience, slug } = await params
  if (audience !== "seeker" && audience !== "employer") {
    notFound()
  }

  const article = await prisma.article.findFirst({
    where: { slug, ...publishedArticleFilter() },
    select: {
      slug: true,
      title: true,
      body: true,
      excerpt: true,
      updatedAt: true,
      category: true,
      status: true,
      subcategory: true,
    },
  })

  if (!article || article.category !== helpCategory(audience)) {
    notFound()
  }

  // 同セクション内の前後記事を引く（ナビゲーション用）
  const sections = getHelpSections(audience)
  const flatList = sections.flatMap((s) => s.articles)
  const currentIndex = flatList.findIndex((a) => a.slug === slug)
  const prev = currentIndex > 0 ? flatList[currentIndex - 1] : null
  const next =
    currentIndex >= 0 && currentIndex < flatList.length - 1
      ? flatList[currentIndex + 1]
      : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/help" className="hover:text-gray-700">
          ヘルプセンター
        </Link>
        <span className="mx-1">/</span>
        <Link href={`/help/${audience}`} className="hover:text-gray-700">
          {AUDIENCE_LABELS[audience]}
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{article.title}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">{article.title}</h1>
      {article.excerpt && (
        <p className="mt-2 text-gray-600">{article.excerpt}</p>
      )}
      <p className="mt-2 text-xs text-gray-400">
        最終更新: {article.updatedAt.toLocaleDateString("ja-JP")}
      </p>

      <article
        className="prose prose-sm sm:prose-base max-w-none mt-8"
        dangerouslySetInnerHTML={{ __html: article.body }}
      />

      <div className="mt-12 grid gap-3 sm:grid-cols-2">
        {prev ? (
          <Link
            href={`/help/${audience}/${prev.slug}`}
            className="border bg-white p-4 hover:bg-gray-50"
          >
            <span className="flex items-center text-xs text-gray-500">
              <ChevronLeft className="mr-1 h-3 w-3" />
              前の記事
            </span>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {prev.title}
            </p>
          </Link>
        ) : (
          <div />
        )}
        {next && (
          <Link
            href={`/help/${audience}/${next.slug}`}
            className="border bg-white p-4 hover:bg-gray-50 sm:text-right"
          >
            <span className="flex items-center justify-end text-xs text-gray-500">
              次の記事
              <ChevronRight className="ml-1 h-3 w-3" />
            </span>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {next.title}
            </p>
          </Link>
        )}
      </div>
    </div>
  )
}

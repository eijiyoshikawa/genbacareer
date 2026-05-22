import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronRight } from "lucide-react"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import {
  getHelpSections,
  helpCategory,
  type HelpSection,
} from "@/lib/help-articles"

export const revalidate = 3600 // 1 時間 ISR

const AUDIENCE_LABELS = {
  seeker: "求職者向けマニュアル",
  employer: "求人掲載側マニュアル",
} as const

type Props = {
  params: Promise<{ audience: string }>
}

// ビルド時に prerender すると DB 接続が必要になるため、空配列でオンデマンド化。
// ISR の revalidate で初回リクエスト後にキャッシュ。
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({
  params,
}: Props): Promise<Metadata> {
  const { audience } = await params
  if (audience !== "seeker" && audience !== "employer") {
    return { title: "ページが見つかりません" }
  }
  const label = AUDIENCE_LABELS[audience]
  return {
    title: label,
    description: `ゲンバキャリアの${label}。基本操作からよくある質問までを章立てでご案内します。`,
  }
}

export default async function HelpAudiencePage({ params }: Props) {
  const { audience } = await params
  if (audience !== "seeker" && audience !== "employer") {
    notFound()
  }

  const sections = getHelpSections(audience)
  const category = helpCategory(audience)

  // DB に登録済みの記事 slug を引いて、雛形にあるが DB 未登録のものは "準備中" 表示
  const published = await prisma.article
    .findMany({
      where: { ...publishedArticleFilter(), category },
      select: { slug: true, updatedAt: true },
    })
    .catch(() => [])
  const publishedSlugs = new Set(published.map((a) => a.slug))

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/help" className="hover:text-gray-700">
          ヘルプセンター
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{AUDIENCE_LABELS[audience]}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">
        {AUDIENCE_LABELS[audience]}
      </h1>

      <div className="mt-8 space-y-10">
        {sections.map((section: HelpSection) => (
          <section key={section.key}>
            <h2 className="text-lg font-bold text-gray-900">{section.label}</h2>
            <ul className="mt-3 divide-y border bg-white">
              {section.articles.map((article) => {
                const isPublished = publishedSlugs.has(article.slug)
                return (
                  <li key={article.slug}>
                    {isPublished ? (
                      <Link
                        href={`/help/${audience}/${article.slug}`}
                        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {article.title}
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {article.excerpt}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      </Link>
                    ) : (
                      <div className="flex items-center justify-between px-4 py-3 opacity-60">
                        <div>
                          <p className="font-medium text-gray-900">
                            {article.title}
                            <span className="ml-2 inline-block bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                              準備中
                            </span>
                          </p>
                          <p className="mt-1 text-sm text-gray-600">
                            {article.excerpt}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-12 border bg-warm-50 p-6">
        <h2 className="font-bold text-gray-900">解決しない場合は</h2>
        <p className="mt-2 text-sm text-gray-700">
          上記で解決しない場合は、お問い合わせフォームよりサポートまでご連絡ください。
        </p>
        <Link
          href="/contact"
          className="mt-4 inline-flex items-center bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          お問い合わせへ
        </Link>
      </div>
    </div>
  )
}

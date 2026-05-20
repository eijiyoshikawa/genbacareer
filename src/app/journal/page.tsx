import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { publishedArticleFilter } from "@/lib/articles"
import { Newspaper, Search, ChevronRight } from "lucide-react"
import { Pagination } from "@/components/pagination"

// 記事一覧は 30 分単位の更新で十分。
export const revalidate = 1800

export const metadata: Metadata = {
  title: "建設業マガジン | ゲンバキャリア",
  description:
    "建設業界で働く方に役立つ情報を発信。転職ガイド、資格情報、業界知識、体験談など 350 記事超を掲載。",
  alternates: { canonical: "/journal" },
  openGraph: {
    title: "建設業マガジン | ゲンバキャリア",
    description: "転職・資格・業界知識・体験談。建設業特化のキャリアマガジン。",
  },
}

const CATEGORY_LABELS: Record<string, string> = {
  career: "転職・キャリア",
  salary: "年収・給与",
  license: "資格・免許",
  "job-type": "職種解説",
  industry: "業界知識",
  interview: "体験談",
}

const PER_PAGE = 20

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function JournalPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? "1"))
  const categoryFilter = params.category ?? ""

  const where = {
    ...publishedArticleFilter(),
    ...(categoryFilter ? { category: categoryFilter } : {}),
  }

  const [articles, total, featured, categories, popular] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: { slug: true, title: true, excerpt: true, category: true, imageUrl: true, publishedAt: true, featured: true },
    }),
    prisma.article.count({ where }),
    page === 1 && !categoryFilter
      ? prisma.article.findMany({
          where: { ...publishedArticleFilter(), featured: true },
          orderBy: { publishedAt: "desc" },
          take: 3,
          select: { slug: true, title: true, category: true, imageUrl: true },
        })
      : Promise.resolve([]),
    prisma.article.groupBy({
      by: ["category"],
      where: publishedArticleFilter(),
      _count: true,
      orderBy: { _count: { category: "desc" } },
    }),
    // 13.1: 人気記事ランキング (viewCount desc, 上位 5 件)
    prisma.article.findMany({
      where: publishedArticleFilter(),
      orderBy: { viewCount: "desc" },
      take: 5,
      select: { slug: true, title: true, category: true, viewCount: true },
    }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div>
      {/* Header */}
      <div className="bg-primary-700 text-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-5">
          <h1 className="flex items-center gap-2 text-xl font-bold">
            <Newspaper className="h-6 w-6" />
            建設求人マガジン
          </h1>
          <p className="mt-1 text-sm text-primary-200">建設業界で働く方に役立つ情報を発信</p>
        </div>
      </div>

      {/* Category tabs */}
      <div className="border-b bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 overflow-x-auto scrollbar-hide">
          <div className="flex gap-1 py-2 min-w-max">
            <Link
              href="/journal"
              className={`shrink-0  px-4 py-1.5 text-sm font-medium transition ${
                !categoryFilter ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-primary-50"
              }`}
            >
              すべて
            </Link>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <Link
                key={key}
                href={`/journal?category=${key}`}
                className={`shrink-0  px-4 py-1.5 text-sm font-medium transition ${
                  categoryFilter === key ? "bg-primary-600 text-white" : "text-gray-600 hover:bg-primary-50"
                }`}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Featured (only on page 1, no filter) */}
        {featured.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-3 mb-8">
            {featured.map((a) => (
              <Link key={a.slug} href={`/journal/${a.slug}`} className="group overflow-hidden  border bg-white">
                {a.imageUrl && (
                  <div className="aspect-video relative overflow-hidden">
                    <Image
                      src={a.imageUrl}
                      alt={a.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 33vw"
                      className="object-cover group-hover:scale-[1.02] transition duration-300"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3 pt-8">
                      <span className="bg-primary-600 px-2 py-0.5 text-xs font-medium text-white">
                        {CATEGORY_LABELS[a.category] ?? a.category}
                      </span>
                      <p className="mt-1 text-sm font-bold text-white line-clamp-2">{a.title}</p>
                    </div>
                  </div>
                )}
                {!a.imageUrl && (
                  <div className="p-4">
                    <span className="text-xs font-medium text-primary-600">{CATEGORY_LABELS[a.category] ?? a.category}</span>
                    <p className="mt-1 text-sm font-medium text-gray-900 group-hover:text-primary-600">{a.title}</p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        <div className="flex flex-col gap-8 lg:flex-row">
          {/* Main */}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-500 mb-4">
              {categoryFilter && <span className="font-medium text-gray-900">{CATEGORY_LABELS[categoryFilter] ?? categoryFilter}</span>}
              {categoryFilter && " の記事 "}
              <span className="font-medium text-primary-600">{total}</span> 件
            </p>

            {articles.length === 0 ? (
              <div className=" border bg-white p-12 text-center">
                <p className="text-gray-500">記事が見つかりませんでした。</p>
              </div>
            ) : (
              <div className="space-y-3">
                {articles.map((a) => (
                  <Link key={a.slug} href={`/journal/${a.slug}`} className="group flex gap-4  border bg-white p-3 hover:border-primary-200 transition">
                    {a.imageUrl && (
                      <div className="relative h-20 w-32 shrink-0 overflow-hidden sm:h-24 sm:w-40">
                        <Image
                          src={a.imageUrl}
                          alt={a.title}
                          fill
                          sizes="(max-width: 640px) 128px, 160px"
                          className="object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0 py-0.5">
                      <div className="flex items-center gap-2">
                        <span className="bg-primary-50 px-2 py-0.5 text-xs font-medium text-primary-600">
                          {CATEGORY_LABELS[a.category] ?? a.category}
                        </span>
                        {a.publishedAt && (
                          <time className="text-xs text-gray-400">{a.publishedAt.toLocaleDateString("ja-JP")}</time>
                        )}
                      </div>
                      <h3 className="mt-1 text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-primary-600 transition">
                        {a.title}
                      </h3>
                      {a.excerpt && (
                        <p className="mt-1 text-xs text-gray-400 line-clamp-2 hidden sm:block">{a.excerpt}</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-6">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                basePath="/journal"
                searchParams={params}
              />
            </div>
          </div>

          {/* Sidebar */}
          <aside className="w-full shrink-0 lg:w-64 space-y-6">
            <div className=" bg-primary-600 p-5 text-center text-white">
              <p className="font-bold">求人を探す</p>
              <p className="mt-1 text-xs text-primary-200">建設業界の求人を検索</p>
              <Link href="/jobs" className="mt-3 inline-flex items-center gap-1 bg-white px-5 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50">
                <Search className="h-3.5 w-3.5" />
                求人検索
              </Link>
            </div>

            <div className=" border bg-white p-4">
              <h3 className="font-bold text-sm text-gray-900 border-b pb-2">カテゴリー</h3>
              <ul className="mt-2 divide-y">
                {categories.map((c) => (
                  <li key={c.category}>
                    <Link href={`/journal?category=${c.category}`} className="flex items-center justify-between py-2 text-sm text-gray-600 hover:text-primary-600 transition">
                      <span>{CATEGORY_LABELS[c.category] ?? c.category}</span>
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        ({c._count})
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* 人気記事ランキング (13.1) */}
            {popular.length > 0 && (
              <div className="border bg-white p-4">
                <h3 className="font-bold text-sm text-gray-900 border-b pb-2">
                  よく読まれている記事
                </h3>
                <ol className="mt-2 space-y-2">
                  {popular.map((a, idx) => (
                    <li key={a.slug} className="flex gap-3">
                      <span
                        className={`shrink-0 flex h-6 w-6 items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? "bg-amber-400 text-white"
                            : idx === 1
                              ? "bg-gray-300 text-white"
                              : idx === 2
                                ? "bg-amber-700 text-white"
                                : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {idx + 1}
                      </span>
                      <Link
                        href={`/journal/${a.slug}`}
                        className="text-xs text-gray-700 hover:text-primary-600 line-clamp-2 leading-relaxed"
                      >
                        {a.title}
                      </Link>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

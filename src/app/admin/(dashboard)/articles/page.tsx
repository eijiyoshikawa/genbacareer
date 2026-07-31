import { prisma } from "@/lib/db"
import { parsePage } from "@/lib/pagination"
import Link from "next/link"
import type { Metadata } from "next"
import { Pagination } from "@/components/pagination"
import { CATEGORY_LABELS, ARTICLE_CATEGORIES } from "@/lib/article-categories"

export const metadata: Metadata = {
  title: "記事管理",
}

type SP = {
  page?: string
  q?: string
  status?: string
  category?: string
}

export default async function AdminArticlesPage({
  searchParams,
}: {
  searchParams: Promise<SP>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const query = params.q ?? ""
  const statusFilter = params.status ?? ""
  const categoryFilter = params.category ?? ""
  const perPage = 20

  const where = {
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(categoryFilter ? { category: categoryFilter } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" as const } },
            { slug: { contains: query, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        slug: true,
        title: true,
        category: true,
        status: true,
        featured: true,
        publishedAt: true,
        viewCount: true,
        updatedAt: true,
      },
    }),
    prisma.article.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">記事管理</h1>
          <p className="mt-1 text-sm text-gray-500">登録記事: {total} 件</p>
        </div>
        <Link
          href="/admin/articles/new"
          className="bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + 記事を追加
        </Link>
      </div>

      {/* 執筆ガイドラインへの導線 (新規作成前に必ず読む) */}
      <Link
        href="/admin/docs/article-guidelines"
        className="press mt-4 flex items-center justify-between gap-3 border border-primary-200 bg-primary-50/40 px-4 py-3 hover:bg-primary-50 hover:border-primary-400 transition"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-primary-700 tracking-wide">
            EDITORIAL HANDBOOK
          </p>
          <p className="mt-0.5 text-sm font-bold text-gray-900">
            記事執筆ガイドラインを読む (新規記事前に必読)
          </p>
          <p className="mt-0.5 text-xs text-gray-600">
            SEO 設計 / E-E-A-T / NG リスト / 公開前チェックリスト 13 項目
          </p>
        </div>
        <span className="text-primary-600 font-bold text-sm shrink-0">→</span>
      </Link>

      {/* Filters */}
      <form className="mt-4 flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="タイトル・slugで検索..."
          className="border px-3 py-1.5 text-sm flex-1 min-w-[200px] max-w-sm"
        />
        <select
          name="status"
          defaultValue={statusFilter}
          className="border px-3 py-1.5 text-sm"
        >
          <option value="">すべての状態</option>
          <option value="published">公開中</option>
          <option value="draft">下書き</option>
        </select>
        <select
          name="category"
          defaultValue={categoryFilter}
          className="border px-3 py-1.5 text-sm"
        >
          <option value="">すべてのカテゴリ</option>
          {ARTICLE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-primary-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-600"
        >
          絞り込み
        </button>
      </form>

      {articles.length === 0 ? (
        <div className="mt-6 border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">記事が見つかりません。</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  タイトル
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  カテゴリ
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  状態
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  PV
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  公開日
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {articles.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">
                      {a.featured && (
                        <span className="mr-1 inline-block bg-yellow-100 px-1.5 py-0.5 text-xs font-semibold text-yellow-800">
                          注目
                        </span>
                      )}
                      {a.title}
                    </p>
                    <p className="text-xs text-gray-500">{a.slug}</p>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {CATEGORY_LABELS[a.category] ?? a.category}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {a.status === "published" ? (
                      <span className="inline-block bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        公開中
                      </span>
                    ) : (
                      <span className="inline-block bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        下書き
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {a.viewCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                    {a.publishedAt
                      ? a.publishedAt.toLocaleDateString("ja-JP")
                      : "—"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right text-sm">
                    <Link
                      href={`/admin/articles/${a.id}/edit`}
                      className="font-medium text-primary-600 hover:text-primary-700"
                    >
                      編集
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/articles"
          searchParams={{
            q: query,
            status: statusFilter,
            category: categoryFilter,
          }}
        />
      </div>
    </div>
  )
}

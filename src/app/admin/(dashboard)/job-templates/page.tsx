import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileStack, Plus, AlertTriangle } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "求人テンプレート管理",
  robots: { index: false, follow: false },
}

const CATEGORY_LABELS: Record<string, string> = {
  construction: "建築・躯体",
  civil: "土木",
  electrical: "電気・設備",
  interior: "内装・仕上げ",
  demolition: "解体・産廃",
  driver: "ドライバー・重機",
  management: "施工管理",
  survey: "測量・設計",
  other: "その他",
}

export default async function AdminJobTemplatesPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") redirect("/login")

  const items = await prisma.jobTemplate
    .findMany({
      orderBy: [
        { isActive: "desc" },
        { sortOrder: "asc" },
        { category: "asc" },
        { name: "asc" },
      ],
    })
    .catch(() => [])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <FileStack className="h-6 w-6 text-primary-500" />
            求人テンプレート
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            企業が求人投稿時に選べる雛形を管理します。{items.length} 件登録中。
          </p>
        </div>
        <div className="flex items-center gap-2">
          {items.length === 0 && (
            <form action="/api/admin/job-templates/seed" method="POST">
              <button
                type="submit"
                className="press inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800"
              >
                <AlertTriangle className="h-4 w-4" />
                初期 10 件を取り込む
              </button>
            </form>
          )}
          <Link
            href="/admin/job-templates/new"
            className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            新規作成
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-8 border bg-white p-10 text-center text-sm text-gray-500">
          まだテンプレートが登録されていません。「初期 10 件を取り込む」を押すと
          静的データを DB に転送できます。
        </div>
      ) : (
        <div className="mt-6 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">
                  並び
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">
                  名前
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">
                  カテゴリ
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">
                  給与
                </th>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">
                  状態
                </th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-500 tabular-nums">
                    {t.sortOrder}
                  </td>
                  <td className="px-3 py-2">
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.slug}</p>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-700">
                    {CATEGORY_LABELS[t.category] ?? t.category}
                  </td>
                  <td className="px-3 py-2 text-right text-xs text-gray-600 tabular-nums">
                    {t.salaryMin || t.salaryMax
                      ? `${t.salaryMin?.toLocaleString() ?? "—"} 〜 ${t.salaryMax?.toLocaleString() ?? "—"}`
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    {t.isActive ? (
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold bg-emerald-100 text-emerald-800">
                        公開中
                      </span>
                    ) : (
                      <span className="inline-flex px-2 py-0.5 text-xs font-bold bg-gray-200 text-gray-600">
                        非公開
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Link
                      href={`/admin/job-templates/${t.id}`}
                      className="text-sm font-bold text-primary-700 hover:underline"
                    >
                      編集 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

import { prisma } from "@/lib/db"
import Link from "next/link"
import type { Metadata } from "next"
import { CompanyAdminActions } from "./actions"

export const metadata: Metadata = {
  title: "企業管理",
}

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const query = params.q || ""
  const perPage = 20

  const where = query
    ? { name: { contains: query, mode: "insensitive" as const } }
    : {}

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        industry: true,
        prefecture: true,
        contactEmail: true,
        approvedAt: true,
        suspendedAt: true,
        createdAt: true,
        _count: {
          select: {
            jobs: true,
            companyUsers: true,
            applications: true,
          },
        },
      },
    }),
    prisma.company.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">企業管理</h1>
      <p className="mt-1 text-sm text-gray-500">登録企業: {total} 社</p>

      {/* Search */}
      <form className="mt-4 flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="企業名で検索..."
          className="rounded-md border px-3 py-1.5 text-sm flex-1 max-w-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
      </form>

      {companies.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">企業が見つかりません。</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">企業名</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">業種</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">地域</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">求人数</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">応募数</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">担当者</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">登録日</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状態</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company) => (
                <tr key={company.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">{company.name}</p>
                    {company.contactEmail && (
                      <p className="text-xs text-gray-500">{company.contactEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {company.industry ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {company.prefecture ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {company._count.jobs}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {company._count.applications}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {company._count.companyUsers}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {company.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {company.suspendedAt ? (
                      <span className="inline-flex rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        停止中
                      </span>
                    ) : company.approvedAt ? (
                      <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        承認済み
                      </span>
                    ) : (
                      <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                        未承認
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <CompanyAdminActions
                      companyId={company.id}
                      approvedAt={company.approvedAt}
                      suspendedAt={company.suspendedAt}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/companies?q=${query}&page=${p}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

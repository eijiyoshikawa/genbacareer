import { prisma } from "@/lib/db"
import Link from "next/link"
import { CredentialCell } from "./credential-cell"
import type { Metadata } from "next"
import { Pagination } from "@/components/pagination"

export const metadata: Metadata = {
  title: "企業管理",
}

export const dynamic = "force-dynamic"

type StatusFilter = "all" | "pending" | "approved" | "rejected"

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "申請中", className: "bg-yellow-100 text-yellow-800" },
  approved: { text: "承認済", className: "bg-green-100 text-green-800" },
  rejected: { text: "却下", className: "bg-red-100 text-red-800" },
}

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const query = params.q || ""
  const statusFilter = (params.status as StatusFilter) || "all"
  const perPage = 20

  // HelloWork 由来の参照企業（source='hellowork'）は承認フロー対象外なので
  // admin 一覧からは除外する。直接掲載企業 (source='direct') のみ表示。
  const where = {
    source: "direct",
    ...(query
      ? { name: { contains: query, mode: "insensitive" as const } }
      : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  }

  // _count.applications はテーブルが大きく非常に重いため一覧では取得しない
  // (詳細ページで取得する)。求人数は使い回しのため残す。
  const [companies, total, pendingCount] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        industry: true,
        prefecture: true,
        contactEmail: true,
        createdAt: true,
        status: true,
        _count: {
          select: { jobs: true },
        },
        // admin発行アカウント（平文控えが残っているもののみ）
        companyUsers: {
          where: { issuedLoginPassword: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { email: true, issuedLoginPassword: true },
        },
      },
    }),
    prisma.company.count({ where }),
    prisma.company.count({ where: { source: "direct", status: "pending" } }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">企業管理</h1>
          <p className="mt-1 text-sm text-gray-500">
            登録企業: {total} 社
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800">
                承認待ち {pendingCount} 社
              </span>
            )}
          </p>
        </div>
        <Link
          href="/admin/companies/new"
          className="bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600"
        >
          + 企業を追加
        </Link>
      </div>

      {/* Status filter tabs */}
      <div className="mt-4 flex gap-1 border-b">
        {(["all", "pending", "approved", "rejected"] as const).map((s) => {
          const labels = {
            all: "すべて",
            pending: "申請中",
            approved: "承認済",
            rejected: "却下",
          }
          const isActive = statusFilter === s
          return (
            <Link
              key={s}
              href={`/admin/companies?${new URLSearchParams({
                ...(query ? { q: query } : {}),
                ...(s !== "all" ? { status: s } : {}),
              }).toString()}`}
              className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px ${
                isActive
                  ? "border-primary-600 text-primary-700"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {labels[s]}
            </Link>
          )
        })}
      </div>

      {/* Search */}
      <form className="mt-4 flex gap-2">
        {statusFilter !== "all" && (
          <input type="hidden" name="status" value={statusFilter} />
        )}
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="企業名で検索..."
          className="border px-3 py-1.5 text-sm flex-1 max-w-sm"
        />
        <button
          type="submit"
          className="bg-primary-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
        >
          検索
        </button>
      </form>

      {companies.length === 0 ? (
        <div className="mt-6 border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">企業が見つかりません。</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">企業名</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">業種</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">地域</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">求人数</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">発行ID/PASS</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {companies.map((company) => {
                const status = STATUS_LABEL[company.status] ?? STATUS_LABEL.pending
                return (
                  <tr key={company.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/companies/${company.id}`}
                        className="text-sm font-medium text-primary-700 hover:underline"
                      >
                        {company.name}
                      </Link>
                      {company.contactEmail && (
                        <p className="text-xs text-gray-500">{company.contactEmail}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${status.className}`}
                      >
                        {status.text}
                      </span>
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
                    <td className="px-4 py-3">
                      {company.companyUsers[0]?.issuedLoginPassword ? (
                        <CredentialCell
                          email={company.companyUsers[0].email}
                          password={company.companyUsers[0].issuedLoginPassword}
                        />
                      ) : (
                        <span className="text-xs text-gray-300">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                      {company.createdAt.toLocaleDateString("ja-JP")}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/admin/companies"
          searchParams={{
            ...(query ? { q: query } : {}),
            ...(statusFilter !== "all" ? { status: statusFilter } : {}),
          }}
        />
      </div>
    </div>
  )
}

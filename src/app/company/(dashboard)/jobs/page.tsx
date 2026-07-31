import { auth } from "@/lib/auth"
import { parsePage } from "@/lib/pagination"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Plus, Pencil, BarChart3 } from "lucide-react"
import { Pagination } from "@/components/pagination"
import { DuplicateJobButton } from "@/components/company/duplicate-job-button"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "求人管理",
}

export default async function CompanyJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const params = await searchParams
  const page = parsePage(params.page)
  const statusFilter = params.status || "all"
  const perPage = 20

  const where = {
    companyId,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        category: true,
        status: true,
        viewCount: true,
        publishedAt: true,
        createdAt: true,
        _count: { select: { applications: true } },
      },
    }),
    prisma.job.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">求人管理</h1>
        <Link
          href="/company/jobs/new"
          className="inline-flex items-center gap-2 bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          <Plus className="h-4 w-4" />
          新規作成
        </Link>
      </div>

      {/* Status filter */}
      <div className="mt-4 flex gap-2">
        {[
          { value: "all", label: "すべて" },
          { value: "active", label: "掲載中" },
          { value: "draft", label: "下書き" },
          { value: "closed", label: "終了" },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={`/company/jobs?status=${opt.value}`}
            className={` px-3 py-1 text-sm font-medium ${
              statusFilter === opt.value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {/* Jobs table */}
      {jobs.length === 0 ? (
        <div className="mt-8 border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">求人がありません。</p>
          <Link
            href="/company/jobs/new"
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <Plus className="h-4 w-4" />
            最初の求人を作成する
          </Link>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  求人タイトル
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  応募数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  閲覧数
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  作成日
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-900">
                      {job.title}
                    </p>
                    <p className="text-xs text-gray-500">{job.category}</p>
                  </td>
                  <td className="px-4 py-3">
                    <JobStatusBadge status={job.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {job._count.applications}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {job.viewCount}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {job.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/company/jobs/${job.id}/performance`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-gray-600 hover:text-gray-900"
                      >
                        <BarChart3 className="h-3.5 w-3.5" />
                        成果
                      </Link>
                      <DuplicateJobButton jobId={job.id} />
                      <Link
                        href={`/company/jobs/${job.id}/edit`}
                        className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        編集
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      <div className="mt-4">
        <Pagination currentPage={page} totalPages={totalPages} basePath="/company/jobs" searchParams={{ status: statusFilter }} />
      </div>
    </div>
  )
}

function JobStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    active: { label: "掲載中", className: "bg-green-100 text-green-700" },
    draft: { label: "下書き", className: "bg-gray-100 text-gray-600" },
    closed: { label: "終了", className: "bg-red-100 text-red-600" },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

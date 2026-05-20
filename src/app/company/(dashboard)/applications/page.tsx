import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import type { Metadata } from "next"
import { ApplicationsBulkTable } from "@/components/company/applications-bulk-table"
import { Pagination } from "@/components/pagination"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "応募者管理",
}

export default async function CompanyApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const statusFilter = params.status || "all"

  const baseQuery = statusFilter !== "all" ? `?status=${statusFilter}` : ""
  const atsBase = `/api/company/applications/export-ats${
    baseQuery ? `${baseQuery}&` : "?"
  }format=`

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">応募者管理</h1>
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={`/api/company/applications/export${baseQuery}`}
            className="inline-flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700"
          >
            CSV エクスポート
          </a>
          <details className="relative">
            <summary className="press inline-flex cursor-pointer items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700 list-none">
              ATS 連携 ▾
            </summary>
            <div className="absolute right-0 top-full mt-1 z-20 w-56 border bg-white shadow-lg">
              <a
                href={`${atsBase}hrmos`}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                HRMOS Talent (CSV)
              </a>
              <a
                href={`${atsBase}herp`}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                herp ATS (CSV)
              </a>
              <a
                href={`${atsBase}csv`}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                汎用 CSV (全カラム)
              </a>
              <a
                href={`${atsBase}json`}
                className="block px-3 py-2 text-sm hover:bg-gray-50"
              >
                JSON (API 連携)
              </a>
            </div>
          </details>
        </div>
      </div>

      {/* Status filter */}
      <div className="mt-4 flex flex-wrap gap-2">
        {[
          { value: "all", label: "すべて" },
          { value: "applied", label: "応募済み" },
          { value: "reviewing", label: "選考中" },
          { value: "interview", label: "面接" },
          { value: "offered", label: "内定" },
          { value: "hired", label: "採用" },
          { value: "rejected", label: "不採用" },
        ].map((opt) => (
          <a
            key={opt.value}
            href={`/company/applications?status=${opt.value}`}
            className={` px-3 py-1 text-sm font-medium ${
              statusFilter === opt.value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      <Suspense
        key={`${statusFilter}:${page}`}
        fallback={<ApplicationsListSkeleton />}
      >
        <ApplicationsList
          companyId={companyId}
          page={page}
          statusFilter={statusFilter}
        />
      </Suspense>
    </div>
  )
}

async function ApplicationsList({
  companyId,
  page,
  statusFilter,
}: {
  companyId: string
  page: number
  statusFilter: string
}) {
  const perPage = 20
  const where = {
    companyId,
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        status: true,
        message: true,
        createdAt: true,
        job: { select: { id: true, title: true } },
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
            prefecture: true,
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <>
      {applications.length === 0 ? (
        <div className="mt-8 border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">応募はまだありません。</p>
        </div>
      ) : (
        <ApplicationsBulkTable
          applications={applications.map((app) => ({
            id: app.id,
            status: app.status,
            message: app.message,
            createdAt: app.createdAt.toISOString(),
            job: app.job,
            user: app.user,
          }))}
        />
      )}

      <div className="mt-4">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/company/applications"
          searchParams={{ status: statusFilter }}
        />
      </div>
    </>
  )
}

function ApplicationsListSkeleton() {
  return (
    <div className="mt-8 border bg-white shadow-sm">
      <div className="border-b px-4 py-3">
        <Skeleton className="h-5 w-32" />
      </div>
      <ul className="divide-y">
        {Array.from({ length: 8 }).map((_, i) => (
          <li key={i} className="flex items-start gap-3 px-4 py-3">
            <Skeleton className="h-10 w-10 shrink-0" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
            <Skeleton className="h-5 w-16 shrink-0" />
          </li>
        ))}
      </ul>
    </div>
  )
}

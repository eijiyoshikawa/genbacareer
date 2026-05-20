import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, MapPin } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "応募一覧",
}

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

const statusConfig: Record<string, { label: string; className: string }> = {
  applied: {
    label: "応募済み",
    className: "bg-blue-100 text-blue-700",
  },
  reviewing: {
    label: "選考中",
    className: "bg-yellow-100 text-yellow-700",
  },
  interview: {
    label: "面接",
    className: "bg-purple-100 text-purple-700",
  },
  offered: {
    label: "内定",
    className: "bg-indigo-100 text-indigo-700",
  },
  hired: {
    label: "採用",
    className: "bg-green-100 text-green-700",
  },
  rejected: {
    label: "不採用",
    className: "bg-red-100 text-red-700",
  },
  withdrawn: {
    label: "取り下げ",
    className: "bg-gray-100 text-gray-500",
  },
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? "1"))
  const limit = 20

  const where = { userId: session.user.id }

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            prefecture: true,
            city: true,
            category: true,
            company: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">応募一覧</h1>
        <Link
          href="/mypage"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          マイページに戻る
        </Link>
      </div>

      <p className="mt-2 text-sm text-gray-500">{total} 件の応募</p>

      {applications.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-white p-12 text-center">
          <p className="text-gray-500">まだ応募がありません。</p>
          <Link
            href="/jobs"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            求人を探す
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {applications.map((app) => {
            const config = statusConfig[app.status] ?? {
              label: app.status,
              className: "bg-gray-100 text-gray-700",
            }

            return (
              <Link
                key={app.id}
                href={`/mypage/applications/${app.id}`}
                className="block rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">
                      {app.job.title}
                    </p>
                    {app.job.company && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {app.job.company.name}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {app.job.prefecture}
                      {app.job.city ? ` ${app.job.city}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex flex-shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
                  >
                    {config.label}
                  </span>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  応募日: {app.createdAt.toLocaleDateString("ja-JP")}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <Link
              href={`/mypage/applications?page=${page - 1}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              前へ
            </Link>
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
            if (p > totalPages) return null
            return (
              <Link
                key={p}
                href={`/mypage/applications?page=${p}`}
                className={`rounded-lg border px-3 py-2 text-sm ${
                  p === page
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {p}
              </Link>
            )
          })}
          {page < totalPages && (
            <Link
              href={`/mypage/applications?page=${page + 1}`}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              次へ
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

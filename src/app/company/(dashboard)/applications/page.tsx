import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { ApplicationStatusSelect } from "@/components/company/application-status-select"

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
      include: {
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
    <div>
      <h1 className="text-2xl font-bold text-gray-900">応募者管理</h1>

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
            className={`rounded-full px-3 py-1 text-sm font-medium ${
              statusFilter === opt.value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </a>
        ))}
      </div>

      {applications.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">応募はまだありません。</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  応募者
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  連絡先
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  求人
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  応募日
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <a
                      href={`/company/applications/${app.id}`}
                      className="text-sm font-medium text-blue-700 hover:underline"
                    >
                      {app.user.name ?? "名前未設定"}
                    </a>
                    <p className="text-xs text-gray-500">
                      {app.user.prefecture ?? ""}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-600">{app.user.email}</p>
                    {app.user.phone && (
                      <p className="text-xs text-gray-500">{app.user.phone}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {app.job.title}
                  </td>
                  <td className="px-4 py-3">
                    <ApplicationStatusSelect
                      applicationId={app.id}
                      currentStatus={app.status}
                    />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {app.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/company/applications?status=${statusFilter}&page=${p}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

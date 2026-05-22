import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { getReportReasonLabel } from "@/lib/report-reasons"
import { ReportResolveActions } from "./resolve-actions"

export const metadata: Metadata = {
  title: "通報管理",
}

const TARGET_TYPE_LABEL: Record<string, string> = {
  job: "求人",
  company: "企業",
  user: "ユーザー",
  review: "口コミ",
}

const STATUS_LABEL: Record<string, string> = {
  open: "未対応",
  resolved: "対応済み",
  dismissed: "却下",
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-red-100 text-red-800",
  resolved: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
}

type SearchParams = Promise<{ status?: string }>

export default async function AdminReportsPage(props: {
  searchParams: SearchParams
}) {
  const { status } = await props.searchParams
  const filter = status === "resolved" || status === "dismissed" ? status : "open"

  const [reports, openCount, resolvedCount, dismissedCount] = await Promise.all([
    prisma.report.findMany({
      where: { status: filter },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.report.count({ where: { status: "open" } }),
    prisma.report.count({ where: { status: "resolved" } }),
    prisma.report.count({ where: { status: "dismissed" } }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">通報管理</h1>
      <p className="mt-1 text-sm text-gray-500">
        求人・企業・ユーザー・口コミに対する通報を確認し、対応・却下の判断を行います。
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {(
          [
            { value: "open", label: `未対応 (${openCount})` },
            { value: "resolved", label: `対応済み (${resolvedCount})` },
            { value: "dismissed", label: `却下 (${dismissedCount})` },
          ] as const
        ).map((tab) => (
          <a
            key={tab.value}
            href={`/admin/reports?status=${tab.value}`}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              filter === tab.value
                ? "border-red-600 text-red-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {reports.length === 0 ? (
          <div className="border bg-white p-8 text-center text-sm text-gray-500">
            該当する通報はありません。
          </div>
        ) : (
          reports.map((r) => (
            <div key={r.id} className="border bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      {TARGET_TYPE_LABEL[r.targetType] ?? r.targetType}
                    </span>
                    <code className="text-xs text-gray-500">{r.targetId}</code>
                  </div>
                  <p className="text-sm font-medium text-gray-900">
                    理由: {getReportReasonLabel(r.reason)}
                  </p>
                  {r.detail && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      {r.detail}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {r.reporter
                      ? `通報者: ${r.reporter.name ?? r.reporter.email}`
                      : "匿名通報"}
                    {" · "}
                    {new Date(r.createdAt).toLocaleString("ja-JP")}
                    {r.reporterIp && <> · IP: {r.reporterIp}</>}
                  </p>
                  {r.resolvedAt && r.resolution && (
                    <p className="mt-2 border-t pt-2 text-xs text-gray-600">
                      対応メモ: {r.resolution}（
                      {new Date(r.resolvedAt).toLocaleDateString("ja-JP")}）
                    </p>
                  )}
                </div>

                {r.status === "open" && (
                  <ReportResolveActions reportId={r.id} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

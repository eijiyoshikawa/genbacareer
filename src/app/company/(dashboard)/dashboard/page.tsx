import { Suspense } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Briefcase, Users, Eye, Plus, TrendingUp, Target, Download } from "lucide-react"
import type { Metadata } from "next"
import {
  computeCompanyFunnel,
  computeJobPerformance,
  computeTimeSeries,
  isRangeKey,
  type RangeKey,
} from "@/lib/company-funnel"
import { FunnelChart } from "@/components/company/funnel-chart"
import { TimeSeriesChart } from "@/components/company/timeseries-chart"
import { GbizReminderBanner } from "@/components/company/gbiz-reminder-banner"
import { ClientErrorBoundary } from "@/components/error-boundary"

export const metadata: Metadata = {
  title: "企業ダッシュボード",
}

export const dynamic = "force-dynamic"

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: "30d", label: "30 日" },
  { value: "90d", label: "90 日" },
  { value: "all", label: "全期間" },
]

// =================================================================
// メイン: ページ骨格 + ヘッダのみ同期。重い分析はすべて Suspense でストリーム
// =================================================================
export default async function CompanyDashboard({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/company/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/company/login")

  const params = await searchParams
  const range: RangeKey = isRangeKey(params.range) ? params.range : "30d"

  // ヘッダ用に企業名だけ先に取る (軽い PK 引き)
  const company = await prisma.company
    .findUnique({
      where: { id: companyId },
      select: { name: true, corporateNumber: true },
    })
    .catch(() => null)

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900">
          {company?.name ?? "企業"} ダッシュボード
        </h1>
        <div className="flex items-center gap-2">
          <a
            href={`/api/company/dashboard/export?range=${range}`}
            className="inline-flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700"
          >
            <Download className="h-4 w-4" />
            CSV エクスポート
          </a>
          <Link
            href="/company/jobs/new"
            className="inline-flex items-center gap-2 bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            <Plus className="h-4 w-4" />
            新規求人作成
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <GbizReminderBanner
          corporateNumber={company?.corporateNumber ?? null}
        />
      </div>

      {/* KPI 4 枚カード (軽い WHERE 付き集計) */}
      <Suspense fallback={<KpiSkeleton />}>
        <KpiCards companyId={companyId} />
      </Suspense>

      {/* レンジ切替 */}
      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <TrendingUp className="h-5 w-5 text-primary-600" />
          分析
        </h2>
        <div className="flex items-center gap-1 border bg-warm-50 p-1">
          {RANGE_OPTIONS.map((r) => (
            <Link
              key={r.value}
              href={`/company/dashboard?range=${r.value}`}
              className={`px-3 py-1 text-xs font-bold ${
                range === r.value
                  ? "bg-primary-600 text-white"
                  : "text-gray-700 hover:bg-white"
              }`}
            >
              {r.label}
            </Link>
          ))}
        </div>
      </div>

      {/* ファネル */}
      <Suspense fallback={<BoxSkeleton title="選考ファネル" />}>
        <FunnelSection companyId={companyId} range={range} />
      </Suspense>

      {/* 時系列 */}
      <Suspense fallback={<BoxSkeleton title="時系列推移" />}>
        <TimeSeriesSection companyId={companyId} range={range} />
      </Suspense>

      {/* 求人別 */}
      <Suspense fallback={<TableSkeleton title="求人別パフォーマンス" />}>
        <JobPerformanceSection companyId={companyId} range={range} />
      </Suspense>

      {/* 最近の応募 */}
      <Suspense fallback={<TableSkeleton title="最近の応募" />}>
        <RecentApplicationsSection companyId={companyId} />
      </Suspense>
    </div>
  )
}

// =================================================================
// セクション (各々独立 Suspense)
// =================================================================

async function KpiCards({ companyId }: { companyId: string }) {
  const jobStatsResult = await prisma.job
    .groupBy({
      by: ["status"],
      where: { companyId },
      _count: true,
    })
    .catch(() => null)
  const [totalApplications, totalViews] = await Promise.all([
    prisma.application.count({ where: { companyId } }).catch(() => 0),
    prisma.job
      .aggregate({ where: { companyId }, _sum: { viewCount: true } })
      .catch(() => ({ _sum: { viewCount: 0 as number | null } })),
  ])

  const jobStats = jobStatsResult ?? []
  const activeJobs =
    jobStats.find((s) => s.status === "active")?._count ?? 0
  const totalJobs = jobStats.reduce((sum, s) => sum + s._count, 0)

  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      <div className="border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-primary-100">
            <Briefcase className="h-5 w-5 text-primary-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">掲載中の求人</p>
            <p className="text-2xl font-bold text-gray-900">
              {activeJobs}
              <span className="ml-1 text-sm font-normal text-gray-400">
                / {totalJobs} 件
              </span>
            </p>
          </div>
        </div>
      </div>
      <div className="border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-green-100">
            <Users className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">応募者数（累計）</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalApplications} 件
            </p>
          </div>
        </div>
      </div>
      <div className="border bg-white p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center bg-purple-100">
            <Eye className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">合計閲覧数</p>
            <p className="text-2xl font-bold text-gray-900">
              {totalViews._sum.viewCount ?? 0}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

async function FunnelSection({
  companyId,
  range,
}: {
  companyId: string
  range: RangeKey
}) {
  const funnel = await computeCompanyFunnel(companyId, range)
  return (
    <section className="mt-6 border bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-base font-semibold text-gray-900">選考ファネル</h2>
        <p className="mt-1 text-xs text-gray-500">
          {funnel.range.label} ・ 求人閲覧から採用までの各ステージ件数と前段比
        </p>
      </div>
      <div className="mt-6">
        <ClientErrorBoundary name="funnel-chart">
          <FunnelChart stages={funnel.stages} />
        </ClientErrorBoundary>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="flex items-center gap-3 border border-emerald-200 bg-emerald-50 p-4">
          <Target className="h-5 w-5 text-emerald-700" />
          <div>
            <p className="text-xs text-emerald-700 font-bold">
              総合コンバージョン
            </p>
            <p className="mt-0.5 text-xl font-bold text-emerald-900 tabular-nums">
              {funnel.overallConversion === null
                ? "—"
                : `${(funnel.overallConversion * 100).toFixed(2)}%`}
              <span className="ml-2 text-xs font-normal text-emerald-700">
                閲覧 → 採用
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 border border-primary-200 bg-primary-50 p-4">
          <Users className="h-5 w-5 text-primary-700" />
          <div>
            <p className="text-xs text-primary-700 font-bold">採用件数</p>
            <p className="mt-0.5 text-xl font-bold text-primary-900 tabular-nums">
              {funnel.hiredCount.toLocaleString()} 名
              <span className="ml-2 text-xs font-normal text-primary-700">
                {funnel.range.label}
              </span>
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

async function TimeSeriesSection({
  companyId,
  range,
}: {
  companyId: string
  range: RangeKey
}) {
  const timeSeries = await computeTimeSeries(companyId, range)
  return (
    <section className="mt-6 border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">時系列推移</h2>
      <p className="mt-1 text-xs text-gray-500">
        閲覧 / 応募 / 採用の件数推移（各系列は独立スケールで正規化）
      </p>
      <div className="mt-4">
        <ClientErrorBoundary name="dashboard-timeseries">
          <TimeSeriesChart data={timeSeries} />
        </ClientErrorBoundary>
      </div>
    </section>
  )
}

async function JobPerformanceSection({
  companyId,
  range,
}: {
  companyId: string
  range: RangeKey
}) {
  const jobPerformance = await computeJobPerformance(companyId, range, 10)
  const sortedJobPerformance = [...jobPerformance].sort(
    (a, b) => b.views - a.views
  )
  return (
    <section className="mt-6 border bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          求人別パフォーマンス
        </h2>
        <Link
          href="/company/jobs"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          求人管理 →
        </Link>
      </div>
      <p className="mt-1 text-xs text-gray-500">
        直近 10 件の求人で集計。閲覧数の多い順。
      </p>
      {sortedJobPerformance.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">求人がまだありません。</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">
                  求人
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">
                  閲覧
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">
                  応募
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">
                  採用
                </th>
                <th className="px-3 py-2 text-right text-xs font-bold text-gray-500">
                  閲覧→応募
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sortedJobPerformance.map((row) => (
                <tr key={row.jobId} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <Link
                      href={`/company/jobs/${row.jobId}/edit`}
                      className="text-sm font-medium text-gray-900 hover:text-primary-700 line-clamp-1"
                    >
                      {row.title}
                    </Link>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {row.status === "active"
                        ? "掲載中"
                        : row.status === "draft"
                          ? "下書き"
                          : "終了"}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-gray-700">
                    {row.views.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-gray-700">
                    {row.applications.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums text-gray-700">
                    {row.hired.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right text-sm tabular-nums">
                    {row.viewToApply === null ? (
                      <span className="text-gray-300">—</span>
                    ) : (
                      <span
                        className={
                          row.viewToApply < 0.005
                            ? "text-red-600 font-bold"
                            : row.viewToApply < 0.02
                              ? "text-amber-600 font-bold"
                              : "text-emerald-700 font-bold"
                        }
                      >
                        {(row.viewToApply * 100).toFixed(2)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

async function RecentApplicationsSection({
  companyId,
}: {
  companyId: string
}) {
  const recentApplications = await prisma.application
    .findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: { select: { title: true } },
        user: { select: { name: true, email: true } },
      },
    })
    .catch(() => [])

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">最近の応募</h2>
        <Link
          href="/company/applications"
          className="text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          すべて見る →
        </Link>
      </div>
      {recentApplications.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">まだ応募はありません。</p>
      ) : (
        <div className="mt-4 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  応募者
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
              {recentApplications.map((app) => (
                <tr key={app.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-900">
                    {app.user.name ?? app.user.email}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {app.job.title}
                  </td>
                  <td className="px-4 py-3">
                    <ApplicationStatusBadge status={app.status} />
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
    </div>
  )
}

// =================================================================
// スケルトン部品
// =================================================================

function KpiSkeleton() {
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse bg-gray-100" />
            <div className="flex-1">
              <div className="h-3 w-20 animate-pulse bg-gray-200" />
              <div className="mt-2 h-6 w-16 animate-pulse bg-gray-200" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function BoxSkeleton({ title }: { title: string }) {
  return (
    <section className="mt-6 border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="mt-4 h-48 w-full animate-pulse bg-gray-100" />
    </section>
  )
}

function TableSkeleton({ title }: { title: string }) {
  return (
    <section className="mt-6 border bg-white p-6 shadow-sm">
      <div className="text-sm text-gray-400">{title}</div>
      <div className="mt-4 space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-4 w-full animate-pulse bg-gray-100" />
        ))}
      </div>
    </section>
  )
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    applied: { label: "応募済み", className: "bg-primary-100 text-primary-700" },
    reviewing: { label: "選考中", className: "bg-yellow-100 text-yellow-700" },
    interview: { label: "面接", className: "bg-purple-100 text-purple-700" },
    offered: { label: "内定", className: "bg-green-100 text-green-700" },
    hired: { label: "採用", className: "bg-green-200 text-green-800" },
    rejected: { label: "不採用", className: "bg-gray-100 text-gray-600" },
  }
  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

import Link from "next/link"
import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { approximateCount } from "@/lib/db-stats"
import { daysAgo } from "@/lib/date-range"
import {
  Briefcase,
  Users,
  Building2,
  CreditCard,
  AlertTriangle,
  MessageSquare,
  Flag,
  Gift,
  ShieldCheck,
  TrendingUp,
  ArrowRight,
} from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "管理者ダッシュボード",
}

export const dynamic = "force-dynamic"

// =================================================================
// メイン: 軽いクエリ (要対応タスク) は同期で先に流す。
// 重い参照 (集計 / 一覧) は <Suspense> でストリーミング。
// =================================================================
export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          運営状況のサマリーと、対応待ちタスクの一覧です。
        </p>
      </div>

      {/* 要対応タスク: WHERE 付き count なので index で速い */}
      <Suspense fallback={<UrgentAlertsSkeleton />}>
        <UrgentAlertsSection />
      </Suspense>

      {/* 運営サマリー: total count は重め。独立してストリーム */}
      <Suspense fallback={<SummaryStatsSkeleton />}>
        <SummaryStatsSection />
      </Suspense>

      {/* 応募トレンド */}
      <Suspense fallback={<TrendsSkeleton />}>
        <TrendsSection />
      </Suspense>

      {/* 承認待ち企業 (古い順 5 件) */}
      <Suspense fallback={<TableSkeleton title="承認待ち企業 (古い順 5 件)" />}>
        <PendingCompaniesSection />
      </Suspense>

      {/* 最近の応募 / 通報 (2 列) */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Suspense fallback={<TwoColSkeleton title="最近の応募" />}>
          <RecentApplicationsSection />
        </Suspense>
        <Suspense fallback={<TwoColSkeleton title="最近の通報" />}>
          <RecentReportsSection />
        </Suspense>
      </div>
    </div>
  )
}

// =================================================================
// 要対応タスク (赤・黄バッジ)
// =================================================================
async function UrgentAlertsSection() {
  const [pendingCompanies, pendingReports, pendingReviews, pendingBonuses] =
    await Promise.all([
      prisma.company
        .count({ where: { source: "direct", status: "pending" } })
        .catch(() => 0),
      prisma.report.count({ where: { status: "open" } }).catch(() => 0),
      prisma.companyReview
        .count({ where: { status: "pending" } })
        .catch(() => 0),
      prisma.hiringBonus
        .count({ where: { status: "requested" } })
        .catch(() => 0),
    ])
  const totalUrgent =
    pendingCompanies + pendingReports + pendingReviews + pendingBonuses

  return (
    <section>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <AlertTriangle className="h-5 w-5 text-rose-600" />
          要対応タスク
          {totalUrgent > 0 && (
            <span className="inline-flex items-center bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-800">
              合計 {totalUrgent} 件
            </span>
          )}
        </h2>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <AlertCard
          href="/admin/companies?status=pending"
          icon={<Building2 className="h-5 w-5" />}
          label="企業承認待ち"
          count={pendingCompanies}
          tone={pendingCompanies > 0 ? "danger" : "ok"}
          cta="承認画面へ"
        />
        <AlertCard
          href="/admin/reports"
          icon={<Flag className="h-5 w-5" />}
          label="未対応 通報"
          count={pendingReports}
          tone={pendingReports > 0 ? "warn" : "ok"}
          cta="通報を見る"
        />
        <AlertCard
          href="/admin/company-reviews"
          icon={<MessageSquare className="h-5 w-5" />}
          label="口コミ審査待ち"
          count={pendingReviews}
          tone={pendingReviews > 0 ? "warn" : "ok"}
          cta="モデレーションへ"
        />
        <AlertCard
          href="/admin/hiring-bonuses"
          icon={<Gift className="h-5 w-5" />}
          label="採用ボーナス申請"
          count={pendingBonuses}
          tone={pendingBonuses > 0 ? "warn" : "ok"}
          cta="申請を確認"
        />
      </div>
    </section>
  )
}

// =================================================================
// 運営サマリー (各種総数)
// =================================================================
async function SummaryStatsSection() {
  const since7d = daysAgo(7)
  const since30d = daysAgo(30)
  // 大きいテーブルの「総数」は pg_class.reltuples で近似値を返す。
  // 「ステータス別」「期間別」は WHERE に index が効くので prisma.count() のまま。
  const [
    activeJobs,
    pendingJobsQuality,
    totalUsersApprox,
    newUsers7d,
    totalCompaniesApprox,
    pendingCompanies,
    billingSum30d,
  ] = await Promise.all([
    prisma.job.count({ where: { status: "active" } }).catch(() => 0),
    prisma.job
      .count({ where: { status: "draft", source: "direct" } })
      .catch(() => 0),
    approximateCount("users"),
    prisma.user
      .count({ where: { createdAt: { gte: since7d } } })
      .catch(() => 0),
    approximateCount("companies"),
    prisma.company
      .count({ where: { source: "direct", status: "pending" } })
      .catch(() => 0),
    prisma.billingEvent
      .aggregate({
        _sum: { amount: true },
        _count: true,
        where: { status: "paid", createdAt: { gte: since30d } },
      })
      .catch(() => ({ _sum: { amount: 0 as number | null }, _count: 0 })),
  ])

  return (
    <section>
      <h2 className="text-base font-bold text-gray-900">運営サマリー</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-primary-600" />}
          iconBg="bg-primary-100"
          label="掲載中 求人"
          value={activeJobs.toLocaleString()}
          sub={
            pendingJobsQuality > 0
              ? `下書き ${pendingJobsQuality} 件`
              : "全件公開中"
          }
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-100"
          label="求職者"
          value={`約 ${totalUsersApprox.toLocaleString()}`}
          sub={`過去 7 日: +${newUsers7d}`}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="登録企業"
          value={`約 ${totalCompaniesApprox.toLocaleString()}`}
          sub={
            pendingCompanies > 0
              ? `うち承認待ち ${pendingCompanies}`
              : "全件承認済み"
          }
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-100"
          label="売上 (直近 30 日)"
          value={`¥${(billingSum30d._sum.amount ?? 0).toLocaleString()}`}
          sub={`成果報酬 ${billingSum30d._count} 件`}
        />
      </div>
    </section>
  )
}

// =================================================================
// 応募トレンド
// =================================================================
async function TrendsSection() {
  const since7d = daysAgo(7)
  const since30d = daysAgo(30)
  // 累計は近似値で十分。期間別は index で速い
  const [totalApplicationsApprox, newApplications7d, newApplications30d] =
    await Promise.all([
      approximateCount("applications"),
      prisma.application
        .count({ where: { createdAt: { gte: since7d } } })
        .catch(() => 0),
      prisma.application
        .count({ where: { createdAt: { gte: since30d } } })
        .catch(() => 0),
    ])

  return (
    <section className="border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
        <TrendingUp className="h-5 w-5 text-primary-600" />
        応募トレンド
      </h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <TrendCell
          label="累計 応募数"
          value={`約 ${totalApplicationsApprox.toLocaleString()}`}
        />
        <TrendCell
          label="直近 30 日"
          value={newApplications30d.toLocaleString()}
          highlight
        />
        <TrendCell
          label="直近 7 日"
          value={newApplications7d.toLocaleString()}
        />
      </div>
      <SimpleBarChart total30={newApplications30d} total7={newApplications7d} />
    </section>
  )
}

// =================================================================
// 承認待ち企業 (古い順 5 件)
// =================================================================
async function PendingCompaniesSection() {
  const recentPendingCompanies = await prisma.company
    .findMany({
      where: { source: "direct", status: "pending" },
      orderBy: { createdAt: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        industry: true,
        prefecture: true,
        contactEmail: true,
        createdAt: true,
      },
    })
    .catch(() => [])

  return (
    <section className="border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <ShieldCheck className="h-5 w-5 text-primary-600" />
          承認待ち企業 (古い順 5 件)
        </h2>
        <Link
          href="/admin/companies?status=pending"
          className="inline-flex items-center gap-1 text-xs text-primary-700 hover:underline"
        >
          すべて見る <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
      {recentPendingCompanies.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">承認待ちの企業はありません。</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50 text-xs text-gray-600">
            <tr>
              <th className="px-4 py-2 text-left">企業名</th>
              <th className="px-4 py-2 text-left">業種</th>
              <th className="px-4 py-2 text-left">地域</th>
              <th className="px-4 py-2 text-left">メール</th>
              <th className="px-4 py-2 text-left">申請日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {recentPendingCompanies.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50">
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="font-bold text-primary-700 hover:underline"
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="px-4 py-2 text-gray-600">{c.industry ?? "—"}</td>
                <td className="px-4 py-2 text-gray-600">
                  {c.prefecture ?? "—"}
                </td>
                <td className="px-4 py-2 text-gray-600 text-xs">
                  {c.contactEmail ?? "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-2 text-gray-500 text-xs">
                  {c.createdAt.toLocaleDateString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

// =================================================================
// 最近の応募
// =================================================================
async function RecentApplicationsSection() {
  const recentApplications = await prisma.application
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: { select: { title: true } },
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    })
    .catch(() => [])

  return (
    <section className="border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="text-base font-bold text-gray-900">最近の応募</h2>
        <Link
          href="/admin/analytics"
          className="text-xs text-primary-700 hover:underline"
        >
          分析へ →
        </Link>
      </div>
      {recentApplications.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">応募はまだありません。</p>
      ) : (
        <ul className="divide-y">
          {recentApplications.map((a) => (
            <li key={a.id} className="px-5 py-3 text-sm">
              <p className="font-bold text-gray-900">
                {a.user.name ?? a.user.email}
              </p>
              <p className="text-xs text-gray-500">
                {a.job.title} ・ {a.company?.name ?? "—"}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {a.createdAt.toLocaleString("ja-JP")} ・ {a.status}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// =================================================================
// 最近の通報
// =================================================================
async function RecentReportsSection() {
  const recentReports = await prisma.report
    .findMany({
      where: { status: "open" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        targetType: true,
        targetId: true,
        reason: true,
        createdAt: true,
      },
    })
    .catch(() => [])

  return (
    <section className="border bg-white shadow-sm">
      <div className="flex items-center justify-between border-b px-5 py-3">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
          <Flag className="h-4 w-4 text-rose-600" />
          最近の通報 (未対応のみ)
        </h2>
        <Link
          href="/admin/reports"
          className="text-xs text-primary-700 hover:underline"
        >
          すべて見る →
        </Link>
      </div>
      {recentReports.length === 0 ? (
        <p className="p-5 text-sm text-gray-500">未対応の通報はありません。</p>
      ) : (
        <ul className="divide-y">
          {recentReports.map((r) => (
            <li key={r.id} className="px-5 py-3 text-sm">
              <p className="font-bold text-gray-900">
                {targetTypeLabel(r.targetType)}: {r.reason}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                {r.createdAt.toLocaleString("ja-JP")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

// =================================================================
// プレゼンテーション部品
// =================================================================

function AlertCard({
  href,
  icon,
  label,
  count,
  tone,
  cta,
}: {
  href: string
  icon: React.ReactNode
  label: string
  count: number
  tone: "danger" | "warn" | "ok"
  cta: string
}) {
  const toneClass =
    tone === "danger"
      ? "border-rose-300 bg-rose-50"
      : tone === "warn"
        ? "border-amber-300 bg-amber-50"
        : "border-gray-200 bg-white"
  const numberClass =
    tone === "danger"
      ? "text-rose-700"
      : tone === "warn"
        ? "text-amber-700"
        : "text-gray-400"
  return (
    <Link
      href={href}
      className={`block border ${toneClass} p-4 shadow-sm transition hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-600">{label}</span>
        <span className={tone === "ok" ? "text-gray-400" : "text-gray-500"}>
          {icon}
        </span>
      </div>
      <p className={`mt-2 text-3xl font-bold ${numberClass}`}>{count}</p>
      <p className="mt-1 inline-flex items-center gap-1 text-xs text-primary-700">
        {cta} <ArrowRight className="h-3 w-3" />
      </p>
    </Link>
  )
}

function StatCard({
  icon,
  iconBg,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  iconBg: string
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
    </div>
  )
}

function TrendCell({
  label,
  value,
  highlight = false,
}: {
  label: string
  value: string
  highlight?: boolean
}) {
  return (
    <div className={highlight ? "border-l-4 border-primary-500 pl-3" : "pl-3"}>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function SimpleBarChart({
  total30,
  total7,
}: {
  total30: number
  total7: number
}) {
  const max = Math.max(total30, 1)
  const w7 = Math.round((total7 / max) * 100)
  return (
    <div className="mt-4 space-y-2">
      <div>
        <p className="text-xs text-gray-500">直近 30 日</p>
        <div className="mt-1 h-5 w-full bg-gray-100">
          <div className="h-5 bg-primary-500" style={{ width: "100%" }} />
        </div>
      </div>
      <div>
        <p className="text-xs text-gray-500">直近 7 日</p>
        <div className="mt-1 h-5 w-full bg-gray-100">
          <div className="h-5 bg-amber-400" style={{ width: `${w7}%` }} />
        </div>
      </div>
    </div>
  )
}

function targetTypeLabel(t: string): string {
  switch (t) {
    case "job":
      return "求人"
    case "company":
      return "企業"
    case "user":
      return "ユーザー"
    case "review":
      return "口コミ"
    default:
      return t
  }
}

// =================================================================
// Suspense fallback (各セクションスケルトン)
// =================================================================

function UrgentAlertsSkeleton() {
  return (
    <section>
      <div className="h-5 w-40 animate-pulse bg-gray-200" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border bg-white p-4 shadow-sm">
            <div className="h-3 w-20 animate-pulse bg-gray-200" />
            <div className="mt-2 h-8 w-12 animate-pulse bg-gray-200" />
          </div>
        ))}
      </div>
    </section>
  )
}

function SummaryStatsSkeleton() {
  return (
    <section>
      <div className="h-5 w-32 animate-pulse bg-gray-200" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border bg-white p-5 shadow-sm">
            <div className="h-3 w-20 animate-pulse bg-gray-200" />
            <div className="mt-2 h-6 w-16 animate-pulse bg-gray-200" />
          </div>
        ))}
      </div>
    </section>
  )
}

function TrendsSkeleton() {
  return (
    <section className="border bg-white p-5 shadow-sm">
      <div className="h-5 w-32 animate-pulse bg-gray-200" />
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i}>
            <div className="h-3 w-20 animate-pulse bg-gray-200" />
            <div className="mt-1 h-6 w-24 animate-pulse bg-gray-200" />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-5 w-full animate-pulse bg-gray-100" />
        <div className="h-5 w-2/3 animate-pulse bg-gray-100" />
      </div>
    </section>
  )
}

function TableSkeleton({ title }: { title: string }) {
  return (
    <section className="border bg-white shadow-sm">
      <div className="border-b px-5 py-3">
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-5 py-3">
            <div className="h-4 w-1/2 animate-pulse bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  )
}

function TwoColSkeleton({ title }: { title: string }) {
  return (
    <section className="border bg-white shadow-sm">
      <div className="border-b px-5 py-3">
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="divide-y">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="px-5 py-3">
            <div className="h-4 w-2/3 animate-pulse bg-gray-100" />
            <div className="mt-2 h-3 w-1/3 animate-pulse bg-gray-100" />
          </div>
        ))}
      </div>
    </section>
  )
}

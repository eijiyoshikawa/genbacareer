import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, MessageCircle, MousePointerClick, TrendingUp } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "求人パフォーマンス",
}

export default async function JobPerformancePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const { id } = await params
  const job = await prisma.job.findFirst({
    where: { id, companyId },
    select: {
      id: true,
      title: true,
      status: true,
      publishedAt: true,
      viewCount: true,
      rankScore: true,
    },
  })
  if (!job) notFound()

  // 7d / 28d の集計はそれぞれ件数のみ
  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const d28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  const [
    applications7d,
    applications28d,
    applicationsTotal,
    clicks7d,
    clicks28d,
    views7d,
    views28d,
  ] = await Promise.all([
    prisma.application.count({ where: { jobId: id, createdAt: { gte: d7 } } }),
    prisma.application.count({ where: { jobId: id, createdAt: { gte: d28 } } }),
    prisma.application.count({ where: { jobId: id } }),
    prisma.applicationClick.count({ where: { jobId: id, clickedAt: { gte: d7 } } }).catch(() => 0),
    prisma.applicationClick.count({ where: { jobId: id, clickedAt: { gte: d28 } } }).catch(() => 0),
    // viewCount は累計値のみ DB に保存しているため、期間別は別途 view event テーブル必要 (未実装)
    Promise.resolve(0),
    Promise.resolve(0),
  ])

  const ctr7d = clicks7d > 0 ? ((applications7d / clicks7d) * 100).toFixed(1) : "—"
  const ctr28d = clicks28d > 0 ? ((applications28d / clicks28d) * 100).toFixed(1) : "—"

  return (
    <div className="space-y-6">
      <Link
        href="/company/jobs"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        求人一覧へ戻る
      </Link>

      <header>
        <p className="text-xs text-gray-500">パフォーマンス</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900 line-clamp-2">
          {job.title}
        </h1>
        <p className="mt-1 text-xs text-gray-500">
          ステータス: <span className="font-medium">{job.status}</span> · rankScore:{" "}
          <span className="font-medium">{job.rankScore}</span>
        </p>
      </header>

      {/* 28 日 KPI */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-2">直近 28 日</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={Eye} label="閲覧数 (累計)" value={job.viewCount.toLocaleString()} sub="開始から" />
          <Kpi icon={MousePointerClick} label="応募 CTA クリック" value={clicks28d.toLocaleString()} />
          <Kpi icon={MessageCircle} label="応募数" value={applications28d.toLocaleString()} />
          <Kpi icon={TrendingUp} label="CVR" value={`${ctr28d}%`} sub="応募 / クリック" />
        </div>
      </section>

      {/* 7 日 KPI */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-2">直近 7 日</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={Eye} label="閲覧数" value="—" sub="期間別は近日対応" />
          <Kpi icon={MousePointerClick} label="応募 CTA クリック" value={clicks7d.toLocaleString()} />
          <Kpi icon={MessageCircle} label="応募数" value={applications7d.toLocaleString()} />
          <Kpi icon={TrendingUp} label="CVR" value={`${ctr7d}%`} sub="応募 / クリック" />
        </div>
      </section>

      {/* 累計 */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-2">累計</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={Eye} label="閲覧数" value={job.viewCount.toLocaleString()} />
          <Kpi icon={MessageCircle} label="応募数" value={applicationsTotal.toLocaleString()} />
          <Kpi
            icon={TrendingUp}
            label="閲覧→応募率"
            value={
              job.viewCount > 0
                ? `${((applicationsTotal / job.viewCount) * 100).toFixed(2)}%`
                : "—"
            }
          />
          <Kpi
            icon={TrendingUp}
            label="掲載日数"
            value={
              job.publishedAt
                ? Math.max(
                    0,
                    Math.floor(
                      (now.getTime() - job.publishedAt.getTime()) /
                        (1000 * 60 * 60 * 24)
                    )
                  ).toString() + " 日"
                : "未公開"
            }
          />
        </div>
      </section>

      <p className="text-xs text-gray-500 leading-relaxed">
        ※ 期間別の閲覧数集計は近日対応予定です。現状は累計のみ表示しています。
        CVR は「応募 / CTA クリック」、閲覧→応募率は「応募 / 閲覧」で算出。
      </p>
    </div>
  )
}

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: typeof Eye
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="border bg-white px-4 py-3">
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-extrabold text-gray-900 tracking-tight">
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400">{sub}</p>}
    </div>
  )
}

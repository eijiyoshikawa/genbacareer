import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Eye, MessageCircle, MousePointerClick, TrendingUp, Users, Coins } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "求人パフォーマンス",
}

// 1 件採用あたりのモデル単価 (13.5 コスパ計算用)。
// 将来は Company 単位の設定値や BillingEvent 実績から算出するが、
// 現段階は業界中央値を仮値として表示する。
const ASSUMED_HIRING_FEE_JPY = 498_000

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

  const now = new Date()
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const d28 = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000)

  const [
    applications7d,
    applications28d,
    applicationsTotal,
    hiredTotal,
    clicks7d,
    clicks28d,
    views7d,
    views28d,
    uniqueViews7dRows,
    uniqueViews28dRows,
  ] = await Promise.all([
    prisma.application.count({ where: { jobId: id, createdAt: { gte: d7 } } }),
    prisma.application.count({ where: { jobId: id, createdAt: { gte: d28 } } }),
    prisma.application.count({ where: { jobId: id } }),
    prisma.application.count({ where: { jobId: id, status: "hired" } }),
    prisma.applicationClick
      .count({ where: { jobId: id, clickedAt: { gte: d7 } } })
      .catch(() => 0),
    prisma.applicationClick
      .count({ where: { jobId: id, clickedAt: { gte: d28 } } })
      .catch(() => 0),
    prisma.jobView
      .count({ where: { jobId: id, viewedAt: { gte: d7 } } })
      .catch(() => 0),
    prisma.jobView
      .count({ where: { jobId: id, viewedAt: { gte: d28 } } })
      .catch(() => 0),
    prisma.jobView
      .findMany({
        where: { jobId: id, viewedAt: { gte: d7 }, sessionId: { not: null } },
        distinct: ["sessionId"],
        select: { sessionId: true },
      })
      .catch(() => [] as { sessionId: string | null }[]),
    prisma.jobView
      .findMany({
        where: { jobId: id, viewedAt: { gte: d28 }, sessionId: { not: null } },
        distinct: ["sessionId"],
        select: { sessionId: true },
      })
      .catch(() => [] as { sessionId: string | null }[]),
  ])

  const uniqueViews7d = uniqueViews7dRows.length
  const uniqueViews28d = uniqueViews28dRows.length

  const fmtPct = (num: number, den: number) =>
    den > 0 ? `${((num / den) * 100).toFixed(1)}%` : "—"

  const cpa28d =
    applications28d > 0
      ? Math.round(ASSUMED_HIRING_FEE_JPY / Math.max(1, applications28d))
      : 0

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
          <Kpi icon={Eye} label="閲覧数 (PV)" value={views28d.toLocaleString()} />
          <Kpi icon={Users} label="ユニーク閲覧" value={uniqueViews28d.toLocaleString()} sub="セッション基準" />
          <Kpi icon={MousePointerClick} label="CTA クリック" value={clicks28d.toLocaleString()} />
          <Kpi icon={MessageCircle} label="応募数" value={applications28d.toLocaleString()} />
          <Kpi icon={TrendingUp} label="クリック率" value={fmtPct(clicks28d, views28d)} sub="クリック / PV" />
          <Kpi icon={TrendingUp} label="CVR" value={fmtPct(applications28d, clicks28d)} sub="応募 / クリック" />
          <Kpi
            icon={TrendingUp}
            label="ファネル全体 CV"
            value={fmtPct(applications28d, views28d)}
            sub="応募 / PV"
          />
          <Kpi
            icon={Coins}
            label="推定 CPA"
            value={cpa28d > 0 ? `¥${cpa28d.toLocaleString()}` : "—"}
            sub="採用単価 ÷ 応募"
          />
        </div>
      </section>

      {/* 7 日 KPI */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-2">直近 7 日</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={Eye} label="閲覧数 (PV)" value={views7d.toLocaleString()} />
          <Kpi icon={Users} label="ユニーク閲覧" value={uniqueViews7d.toLocaleString()} sub="セッション基準" />
          <Kpi icon={MousePointerClick} label="CTA クリック" value={clicks7d.toLocaleString()} />
          <Kpi icon={MessageCircle} label="応募数" value={applications7d.toLocaleString()} />
          <Kpi icon={TrendingUp} label="クリック率" value={fmtPct(clicks7d, views7d)} sub="クリック / PV" />
          <Kpi icon={TrendingUp} label="CVR" value={fmtPct(applications7d, clicks7d)} sub="応募 / クリック" />
          <Kpi
            icon={TrendingUp}
            label="ファネル全体 CV"
            value={fmtPct(applications7d, views7d)}
            sub="応募 / PV"
          />
          <Kpi
            icon={Users}
            label="閲覧/UU 重複度"
            value={uniqueViews7d > 0 ? (views7d / uniqueViews7d).toFixed(1) + "x" : "—"}
            sub="再訪指標"
          />
        </div>
      </section>

      {/* 累計 */}
      <section>
        <h2 className="text-sm font-bold text-gray-900 mb-2">累計</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Kpi icon={Eye} label="閲覧数" value={job.viewCount.toLocaleString()} sub="job.viewCount 集計" />
          <Kpi icon={MessageCircle} label="応募数" value={applicationsTotal.toLocaleString()} />
          <Kpi icon={MessageCircle} label="採用決定" value={hiredTotal.toLocaleString()} sub="status=hired" />
          <Kpi
            icon={TrendingUp}
            label="閲覧→応募率"
            value={fmtPct(applicationsTotal, job.viewCount)}
          />
          <Kpi
            icon={TrendingUp}
            label="応募→採用率"
            value={fmtPct(hiredTotal, applicationsTotal)}
            sub="採用 / 応募"
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
        ※ 推定 CPA は採用単価を ¥{ASSUMED_HIRING_FEE_JPY.toLocaleString()} と仮定した時の
        「応募 1 件あたりの想定コスト」です。実際の課金は採用決定時の成果報酬制で、
        BillingEvent ベースの実値表示は近日対応予定。
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

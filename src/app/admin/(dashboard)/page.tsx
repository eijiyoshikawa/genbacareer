import { Suspense } from "react"
import { prisma } from "@/lib/db"
import { Briefcase, Users, Building2, CreditCard } from "lucide-react"
import type { Metadata } from "next"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "管理者ダッシュボード",
}

// stats は重い COUNT クエリで遅いので Suspense で個別ストリーミング。
// シェルは即時 200 で返り、各カードは準備でき次第 hydrate。
export const dynamic = "force-dynamic"

export default function AdminDashboard() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Suspense fallback={<StatCardSkeleton />}>
          <JobStatsCard />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <UserStatsCard />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <CompanyStatsCard />
        </Suspense>
        <Suspense fallback={<StatCardSkeleton />}>
          <BillingStatsCard />
        </Suspense>
      </div>

      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">最近の応募</h2>
        <Suspense fallback={<RecentApplicationsSkeleton />}>
          <RecentApplications />
        </Suspense>
      </div>
    </div>
  )
}

async function JobStatsCard() {
  const [active, total] = await Promise.all([
    prisma.job.count({ where: { status: "active" } }).catch(() => 0),
    prisma.job.count().catch(() => 0),
  ])
  return (
    <StatCard
      icon={<Briefcase className="h-5 w-5 text-primary-600" />}
      iconBg="bg-primary-100"
      label="求人数"
      value={`${active.toLocaleString()} / ${total.toLocaleString()}`}
      sub="掲載中 / 全体"
    />
  )
}

async function UserStatsCard() {
  const [users, apps] = await Promise.all([
    prisma.user.count().catch(() => 0),
    prisma.application.count().catch(() => 0),
  ])
  return (
    <StatCard
      icon={<Users className="h-5 w-5 text-green-600" />}
      iconBg="bg-green-100"
      label="求職者数"
      value={users.toLocaleString()}
      sub={`${apps.toLocaleString()} 件の応募`}
    />
  )
}

async function CompanyStatsCard() {
  const companies = await prisma.company
    .count({ where: { source: "direct" } })
    .catch(() => 0)
  return (
    <StatCard
      icon={<Building2 className="h-5 w-5 text-purple-600" />}
      iconBg="bg-purple-100"
      label="企業数"
      value={companies.toLocaleString()}
      sub="登録企業"
    />
  )
}

async function BillingStatsCard() {
  const billing = await prisma.billingEvent
    .aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "paid" },
    })
    .catch(() => ({ _sum: { amount: 0 }, _count: 0 }))
  return (
    <StatCard
      icon={<CreditCard className="h-5 w-5 text-orange-600" />}
      iconBg="bg-orange-100"
      label="売上合計"
      value={`¥${(billing._sum.amount ?? 0).toLocaleString()}`}
      sub={`${billing._count} 件の成果報酬`}
    />
  )
}

async function RecentApplications() {
  const recent = await prisma.application
    .findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        job: { select: { title: true } },
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    })
    .catch(() => [])

  if (recent.length === 0) {
    return <p className="mt-4 text-sm text-gray-500">応募はまだありません。</p>
  }

  return (
    <div className="mt-4 overflow-hidden border bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">応募者</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">求人</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">企業</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ステータス</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">日付</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {recent.map((app) => (
            <tr key={app.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 text-sm text-gray-900">
                {app.user.name ?? app.user.email}
              </td>
              <td className="px-4 py-3 text-sm text-gray-600">{app.job.title}</td>
              <td className="px-4 py-3 text-sm text-gray-600">{app.company?.name ?? "—"}</td>
              <td className="px-4 py-3">
                <span className="inline-flex bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                  {app.status}
                </span>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                {app.createdAt.toLocaleDateString("ja-JP")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
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
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
      </div>
    </div>
  )
}

function StatCardSkeleton() {
  return (
    <div className="border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    </div>
  )
}

function RecentApplicationsSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

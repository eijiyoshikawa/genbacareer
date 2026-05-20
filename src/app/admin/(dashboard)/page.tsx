import { prisma } from "@/lib/db"
import { Briefcase, Users, Building2, CreditCard } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "管理者ダッシュボード",
}

export default async function AdminDashboard() {
  const [
    totalJobs,
    activeJobs,
    totalUsers,
    totalCompanies,
    pendingCompanies,
    totalApplications,
    openContacts,
    recentApplications,
    billingStats,
  ] = await Promise.all([
    prisma.job.count(),
    prisma.job.count({ where: { status: "active" } }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.company.count(),
    prisma.company.count({ where: { approvedAt: null, suspendedAt: null } }),
    prisma.application.count(),
    prisma.contactMessage.count({ where: { handledAt: null } }),
    prisma.application.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      include: {
        job: { select: { title: true } },
        user: { select: { name: true, email: true } },
        company: { select: { name: true } },
      },
    }),
    prisma.billingEvent.aggregate({
      _sum: { amount: true },
      _count: true,
      where: { status: "paid" },
    }),
  ])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>

      {/* Stats */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Briefcase className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-100"
          label="求人数"
          value={`${activeJobs} / ${totalJobs}`}
          sub="掲載中 / 全体"
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-100"
          label="求職者数"
          value={totalUsers.toLocaleString()}
          sub={`${totalApplications} 件の応募`}
        />
        <StatCard
          icon={<Building2 className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-100"
          label="企業数"
          value={totalCompanies.toLocaleString()}
          sub={`未承認 ${pendingCompanies} / 未対応問い合わせ ${openContacts}`}
        />
        <StatCard
          icon={<CreditCard className="h-5 w-5 text-orange-600" />}
          iconBg="bg-orange-100"
          label="売上合計"
          value={`¥${(billingStats._sum.amount ?? 0).toLocaleString()}`}
          sub={`${billingStats._count} 件の成果報酬`}
        />
      </div>

      {/* Recent applications */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">最近の応募</h2>
        {recentApplications.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">応募はまだありません。</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
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
                {recentApplications.map((app) => (
                  <tr key={app.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {app.user.name ?? app.user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.job.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.company?.name ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
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
        )}
      </div>
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
    <div className="rounded-lg border bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconBg}`}>
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

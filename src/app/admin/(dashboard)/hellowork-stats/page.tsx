import { prisma } from "@/lib/db"

/**
 * HelloWork 取込統計ダッシュボード。
 * - 全体: source=hellowork の件数（active/closed/expired）
 * - 直近 7 日の新規取込
 * - カテゴリ別配分
 * - 都道府県別 Top 10
 */
export default async function HelloworkStatsPage() {
  const [active, closed, byCategory, byPrefecture, recent7d] = await Promise.all([
    prisma.job.count({ where: { source: "hellowork", status: "active" } }),
    prisma.job.count({ where: { source: "hellowork", status: "closed" } }),
    prisma.job.groupBy({
      by: ["category"],
      where: { source: "hellowork", status: "active" },
      _count: true,
      orderBy: { _count: { category: "desc" } },
    }),
    prisma.job.groupBy({
      by: ["prefecture"],
      where: { source: "hellowork", status: "active" },
      _count: true,
      orderBy: { _count: { prefecture: "desc" } },
      take: 10,
    }),
    prisma.job.count({
      where: {
        source: "hellowork",
        publishedAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    }),
  ])

  const total = active + closed
  const closedRate = total > 0 ? ((closed / total) * 100).toFixed(1) : "0"

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">HelloWork 取込統計</h1>
        <p className="mt-1 text-sm text-gray-500">
          公共求人 (hellowork ソース) の取込状況を集計表示します。
        </p>
      </header>

      {/* KPI カード */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard label="active 件数" value={active.toLocaleString()} color="emerald" />
        <KpiCard label="closed 件数" value={closed.toLocaleString()} color="gray" sub={`${closedRate}%`} />
        <KpiCard label="累計取込" value={total.toLocaleString()} color="blue" />
        <KpiCard label="直近 7 日新規" value={recent7d.toLocaleString()} color="primary" />
      </section>

      {/* カテゴリ別 */}
      <section className="border bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">カテゴリ別 (active)</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {byCategory.map((c) => (
            <div key={c.category} className="border bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500">{c.category}</p>
              <p className="mt-1 text-base font-bold text-gray-900">
                {(c._count ?? 0).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 都道府県別 Top 10 */}
      <section className="border bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">都道府県別 Top 10 (active)</h2>
        <ol className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
          {byPrefecture.map((p, i) => (
            <li
              key={p.prefecture}
              className="border bg-gray-50 px-3 py-2 flex items-baseline justify-between"
            >
              <span className="text-xs text-gray-500">
                {i + 1}. {p.prefecture}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {(p._count ?? 0).toLocaleString()}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function KpiCard({
  label,
  value,
  color,
  sub,
}: {
  label: string
  value: string
  color: "emerald" | "gray" | "blue" | "primary"
  sub?: string
}) {
  const colorMap = {
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-200",
    gray: "bg-gray-50 text-gray-900 border-gray-200",
    blue: "bg-blue-50 text-blue-900 border-blue-200",
    primary: "bg-primary-50 text-primary-900 border-primary-200",
  } as const
  return (
    <div className={`border px-4 py-3 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-80">{label}</p>
      <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      {sub && <p className="text-xs opacity-70 mt-0.5">{sub}</p>}
    </div>
  )
}

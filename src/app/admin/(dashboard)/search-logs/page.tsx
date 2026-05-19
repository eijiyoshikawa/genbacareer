import { prisma } from "@/lib/db"

/**
 * 検索ログ可視化 (admin)。
 * - 直近 24h / 7d の検索数
 * - 人気キーワード Top 20
 * - ゼロヒットキーワード Top 20 (改善の宝庫)
 * - 直近の検索 100 件
 */
export const dynamic = "force-dynamic"

export default async function SearchLogsPage() {
  const now = new Date()
  const d1 = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  // テーブル未作成時のフォールバックは個別 try/catch
  let totals = { last24h: 0, last7d: 0 }
  let topKeywords: Array<{ query: string; n: number; avgResults: number }> = []
  let zeroHit: Array<{ query: string; n: number }> = []
  let recent: Array<{
    id: string
    query: string | null
    prefecture: string | null
    category: string | null
    resultCount: number
    createdAt: Date
  }> = []

  try {
    const [last24h, last7d] = await Promise.all([
      prisma.searchLog.count({ where: { createdAt: { gte: d1 } } }),
      prisma.searchLog.count({ where: { createdAt: { gte: d7 } } }),
    ])
    totals = { last24h, last7d }
  } catch {
    /* table not ready */
  }

  try {
    // 人気キーワード: 7d で集計、Top 20
    const grouped = await prisma.searchLog.groupBy({
      by: ["query"],
      where: {
        createdAt: { gte: d7 },
        query: { not: null },
      },
      _count: true,
      _avg: { resultCount: true },
      orderBy: { _count: { query: "desc" } },
      take: 20,
    })
    topKeywords = grouped
      .filter((g) => g.query)
      .map((g) => ({
        query: g.query!,
        n: g._count ?? 0,
        avgResults: Math.round(g._avg?.resultCount ?? 0),
      }))
  } catch {
    /* ok */
  }

  try {
    // ゼロヒット: resultCount=0 の Top 20
    const grouped = await prisma.searchLog.groupBy({
      by: ["query"],
      where: {
        createdAt: { gte: d7 },
        query: { not: null },
        resultCount: 0,
      },
      _count: true,
      orderBy: { _count: { query: "desc" } },
      take: 20,
    })
    zeroHit = grouped
      .filter((g) => g.query)
      .map((g) => ({ query: g.query!, n: g._count ?? 0 }))
  } catch {
    /* ok */
  }

  try {
    recent = await prisma.searchLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        id: true,
        query: true,
        prefecture: true,
        category: true,
        resultCount: true,
        createdAt: true,
      },
    })
  } catch {
    /* ok */
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">検索ログ</h1>
        <p className="mt-1 text-sm text-gray-500">
          /jobs の検索クエリと結果件数を記録しています。人気キーワードとゼロヒットを把握できます。
        </p>
      </header>

      {/* KPI */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi label="直近 24h の検索数" value={totals.last24h.toLocaleString()} />
        <Kpi label="直近 7d の検索数" value={totals.last7d.toLocaleString()} />
        <Kpi
          label="人気キーワード"
          value={topKeywords.length.toString()}
          sub="Top 20 抽出"
        />
        <Kpi
          label="ゼロヒット"
          value={zeroHit.length.toString()}
          sub="0 件で終わった検索"
        />
      </section>

      {/* 人気キーワード */}
      <section className="border bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">人気キーワード Top 20 (直近 7 日)</h2>
        {topKeywords.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">まだデータがありません。</p>
        ) : (
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">キーワード</th>
                <th className="px-3 py-2 text-right">検索回数</th>
                <th className="px-3 py-2 text-right">平均結果件数</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {topKeywords.map((k, i) => (
                <tr key={k.query} className="hover:bg-gray-50">
                  <td className="px-3 py-2">
                    <span className="text-xs text-gray-400 mr-2">{i + 1}.</span>
                    {k.query}
                  </td>
                  <td className="px-3 py-2 text-right font-bold">{k.n.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right text-gray-600">
                    {k.avgResults.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ゼロヒット */}
      <section className="border bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">ゼロヒット Top 20 (直近 7 日)</h2>
        <p className="mt-1 text-xs text-gray-500">
          ユーザーが検索したが 0 件しか返らなかったキーワード。求人の追加や除外フィルタ調整の参考に。
        </p>
        {zeroHit.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">ゼロヒットの検索はありません 🎉</p>
        ) : (
          <ul className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            {zeroHit.map((z, i) => (
              <li
                key={z.query}
                className="border bg-amber-50 px-3 py-2 text-xs"
              >
                <span className="text-amber-700 font-medium">{i + 1}.</span>
                <span className="ml-1.5 text-gray-900">{z.query}</span>
                <span className="ml-2 text-gray-500">×{z.n}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 直近 100 件 */}
      <section className="border bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">直近 100 件</h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">まだデータがありません。</p>
        ) : (
          <table className="mt-3 min-w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500">
              <tr>
                <th className="px-3 py-2 text-left">時刻</th>
                <th className="px-3 py-2 text-left">クエリ</th>
                <th className="px-3 py-2 text-left">絞り込み</th>
                <th className="px-3 py-2 text-right">結果</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {recent.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-xs text-gray-500 whitespace-nowrap">
                    {r.createdAt.toLocaleString("ja-JP", {
                      month: "2-digit",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-3 py-2">
                    {r.query ?? <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-600">
                    {[r.prefecture, r.category].filter(Boolean).join(" / ") || "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <span
                      className={
                        r.resultCount === 0
                          ? "text-red-600 font-bold"
                          : "text-gray-700"
                      }
                    >
                      {r.resultCount}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

function Kpi({
  label,
  value,
  sub,
}: {
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="border bg-white px-4 py-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-gray-900 tracking-tight">
        {value}
      </p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

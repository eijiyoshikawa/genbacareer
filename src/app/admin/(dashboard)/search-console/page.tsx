/**
 * 9.6 Search Console スナップショット可視化。
 *
 * 直近 7 日間のクエリ別 / ページ別の上位を表示する。
 */

import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { Search, ExternalLink } from "lucide-react"

export const metadata: Metadata = {
  title: "Search Console",
  robots: { index: false, follow: false },
}

export const dynamic = "force-dynamic"

function startOfUtcDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export default async function SearchConsolePage() {
  const now = new Date()
  const since = startOfUtcDay(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000))

  const snapshots = await prisma.searchConsoleSnapshot
    .findMany({
      where: { date: { gte: since } },
      orderBy: [{ date: "desc" }, { clicks: "desc" }],
      take: 2000,
    })
    .catch(() => [])

  const queryAgg = new Map<
    string,
    { clicks: number; impressions: number; ctr: number; position: number; n: number }
  >()
  const pageAgg = new Map<
    string,
    { clicks: number; impressions: number; ctr: number; position: number; n: number }
  >()

  for (const s of snapshots) {
    const q = queryAgg.get(s.query) ?? {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      n: 0,
    }
    q.clicks += s.clicks
    q.impressions += s.impressions
    q.ctr += s.ctr
    q.position += s.position
    q.n += 1
    queryAgg.set(s.query, q)

    const p = pageAgg.get(s.page) ?? {
      clicks: 0,
      impressions: 0,
      ctr: 0,
      position: 0,
      n: 0,
    }
    p.clicks += s.clicks
    p.impressions += s.impressions
    p.ctr += s.ctr
    p.position += s.position
    p.n += 1
    pageAgg.set(s.page, p)
  }

  const topQueries = Array.from(queryAgg.entries())
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 30)
  const topPages = Array.from(pageAgg.entries())
    .sort((a, b) => b[1].clicks - a[1].clicks)
    .slice(0, 30)

  const totalClicks = snapshots.reduce((sum, s) => sum + s.clicks, 0)
  const totalImpressions = snapshots.reduce((sum, s) => sum + s.impressions, 0)
  const avgCtr =
    totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Search className="h-6 w-6 text-primary-600" />
          Search Console
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          過去 7 日間の検索パフォーマンス (日次バッチで取得)
        </p>
      </header>

      {snapshots.length === 0 ? (
        <div className="border bg-amber-50 p-6 text-sm text-amber-800">
          まだスナップショットがありません。
          <code className="mx-1 rounded bg-white px-1 py-0.5">
            /api/cron/search-console-sync
          </code>
          が実行されると蓄積されます。OAuth リフレッシュトークン (
          <code className="mx-1">GSC_OAUTH_CLIENT_ID</code>,
          <code className="mx-1">GSC_OAUTH_CLIENT_SECRET</code>,
          <code className="mx-1">GSC_OAUTH_REFRESH_TOKEN</code>) と{" "}
          <code className="mx-1">GSC_SITE_URL</code>{" "}
          を環境変数に設定してください。
        </div>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500">クリック (7日)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalClicks.toLocaleString()}
              </p>
            </div>
            <div className="border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500">表示回数 (7日)</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {totalImpressions.toLocaleString()}
              </p>
            </div>
            <div className="border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500">平均 CTR</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">
                {avgCtr.toFixed(2)}%
              </p>
            </div>
          </section>

          <section className="border bg-white shadow-sm">
            <h2 className="border-b px-4 py-3 text-sm font-bold text-gray-900">
              上位 検索クエリ
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">クエリ</th>
                    <th className="px-3 py-2 text-right">クリック</th>
                    <th className="px-3 py-2 text-right">表示</th>
                    <th className="px-3 py-2 text-right">CTR</th>
                    <th className="px-3 py-2 text-right">平均順位</th>
                  </tr>
                </thead>
                <tbody>
                  {topQueries.map(([query, a]) => (
                    <tr key={query} className="border-t">
                      <td className="max-w-md truncate px-3 py-2">{query}</td>
                      <td className="px-3 py-2 text-right font-bold">
                        {a.clicks.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {a.impressions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {a.impressions > 0
                          ? ((a.clicks / a.impressions) * 100).toFixed(2)
                          : "0.00"}
                        %
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {(a.position / a.n).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="border bg-white shadow-sm">
            <h2 className="border-b px-4 py-3 text-sm font-bold text-gray-900">
              上位 ランディングページ
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-xs text-gray-600">
                  <tr>
                    <th className="px-3 py-2 text-left">ページ</th>
                    <th className="px-3 py-2 text-right">クリック</th>
                    <th className="px-3 py-2 text-right">表示</th>
                    <th className="px-3 py-2 text-right">CTR</th>
                    <th className="px-3 py-2 text-right">平均順位</th>
                  </tr>
                </thead>
                <tbody>
                  {topPages.map(([page, a]) => (
                    <tr key={page} className="border-t">
                      <td className="max-w-md truncate px-3 py-2">
                        <a
                          href={page}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-primary-700 hover:underline"
                        >
                          {page}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </td>
                      <td className="px-3 py-2 text-right font-bold">
                        {a.clicks.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {a.impressions.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {a.impressions > 0
                          ? ((a.clicks / a.impressions) * 100).toFixed(2)
                          : "0.00"}
                        %
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">
                        {(a.position / a.n).toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  )
}

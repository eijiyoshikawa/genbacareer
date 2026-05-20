/**
 * 7.2 クローラ差分同期 / 8.4 重複求人マージ admin 画面。
 *
 * - 上段: 各ソースの CrawlerSyncCheckpoint 一覧
 * - 中段: dedupeKey バックフィル実行ボタン
 * - 下段: 重複求人マージ実行ボタン
 */

import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { RefreshCw, Layers } from "lucide-react"
import { SyncMaintenanceRunner } from "./maintenance-runner"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "クローラ同期 / 重複マージ",
}

export default async function CrawlerSyncPage() {
  const [checkpoints, dedupeStats] = await Promise.all([
    prisma.crawlerSyncCheckpoint
      .findMany({ orderBy: { lastSyncedAt: "desc" } })
      .catch(() => []),
    // 累計の active 求人と dedupeKey 持ち
    Promise.all([
      prisma.job.count({ where: { status: "active" } }).catch(() => 0),
      prisma.job.count({ where: { status: "active", dedupeKey: { not: null } } }).catch(() => 0),
      prisma.job
        .count({ where: { status: "closed", dedupedTo: { not: null } } })
        .catch(() => 0),
    ]).then(([active, withKey, closedByDedupe]) => ({
      active,
      withKey,
      closedByDedupe,
    })),
  ])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <RefreshCw className="h-6 w-6 text-primary-500" />
          クローラ同期 / 重複マージ
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          各クローラの最終同期状況と、重複求人の検出・閉じる操作を行います。
        </p>
      </header>

      {/* 7.2 同期チェックポイント一覧 */}
      <section className="border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3">
          ソース別 最終同期チェックポイント
        </h2>
        {checkpoints.length === 0 ? (
          <p className="text-sm text-gray-400">
            まだチェックポイントが記録されていません。次のクローラ実行から記録されます。
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr className="text-left text-xs font-bold text-gray-600">
                <th className="py-2 pr-3">ソース</th>
                <th className="py-2 pr-3">最終同期</th>
                <th className="py-2 pr-3 text-right">取込</th>
                <th className="py-2 pr-3 text-right">更新</th>
                <th className="py-2 pr-3 text-right">skip</th>
                <th className="py-2 pr-3 text-right">err</th>
                <th className="py-2 pr-3">cursor</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((c) => (
                <tr key={c.source} className="border-b last:border-b-0">
                  <td className="py-2 pr-3 font-medium text-gray-900">
                    {c.source}
                  </td>
                  <td className="py-2 pr-3 text-gray-600 text-xs">
                    {c.lastSyncedAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                    {c.totalImported.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-700">
                    {c.totalUpdated.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-gray-500">
                    {c.totalSkipped.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-red-600">
                    {c.totalErrors.toLocaleString()}
                  </td>
                  <td className="py-2 pr-3 text-xs text-gray-400 truncate max-w-[200px]">
                    {c.lastCursor ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* 8.4 重複統計 + 実行ボタン */}
      <section className="border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-3">
          <Layers className="h-4 w-4 text-amber-500" />
          重複求人マージ
        </h2>
        <div className="mb-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="active 求人" value={dedupeStats.active} />
          <Stat label="dedupeKey 付き" value={dedupeStats.withKey} />
          <Stat label="重複統合済" value={dedupeStats.closedByDedupe} />
        </div>
        <SyncMaintenanceRunner />
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-gray-200 p-3">
      <p className="text-[10px] text-gray-500">{label}</p>
      <p className="mt-0.5 text-xl font-extrabold tabular-nums text-gray-900">
        {value.toLocaleString()}
      </p>
    </div>
  )
}

import { prisma } from "@/lib/db"
import { Send } from "lucide-react"
import type { Metadata } from "next"
import { SegmentBroadcastClient } from "./broadcast-client"
import { LEAD_STATUSES, LEAD_STATUS_META } from "@/lib/line-lead-status"

export const metadata: Metadata = {
  title: "セグメント配信",
  robots: { index: false, follow: false },
}

export default async function SegmentsPage() {
  // UTM source 一覧 + 直近 broadcast ログを並列取得
  const [utmSources, recentLogs] = await Promise.all([
    prisma.lineLead
      .findMany({
        where: { utmSource: { not: null } },
        select: { utmSource: true },
        distinct: ["utmSource"],
        take: 50,
      })
      .then((rs) =>
        rs
          .map((r) => r.utmSource)
          .filter((s): s is string => !!s)
          .sort()
      )
      .catch(() => [] as string[]),
    prisma.broadcastLog
      .findMany({ orderBy: { createdAt: "desc" }, take: 10 })
      .catch(() => []),
  ])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Send className="h-6 w-6 text-primary-500" />
          セグメント配信
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          UTM や閲覧履歴で lead をグルーピングし、選択した求人を一括 LINE Push で配信できます。
        </p>
      </div>

      <SegmentBroadcastClient
        utmSourceOptions={utmSources}
        statusOptions={LEAD_STATUSES.map((s) => ({
          value: s,
          label: LEAD_STATUS_META[s].label,
        }))}
      />

      {/* 直近の配信ログ */}
      <section className="border bg-white p-4">
        <h2 className="text-base font-bold text-gray-900 mb-3 section-bar">
          直近の配信ログ
        </h2>
        {recentLogs.length === 0 ? (
          <p className="text-sm text-gray-400">まだ配信実績はありません。</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-gray-500">
                <th className="py-2">日時</th>
                <th>セグメント</th>
                <th className="text-right">対象</th>
                <th className="text-right">成功</th>
                <th className="text-right">スキップ</th>
                <th className="text-right">失敗</th>
              </tr>
            </thead>
            <tbody>
              {recentLogs.map((log) => (
                <tr key={log.id} className="border-b text-xs">
                  <td className="py-2 text-gray-600">
                    {new Date(log.createdAt).toLocaleString("ja-JP", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="text-gray-700">
                    <code className="text-xs font-mono">
                      {summarizeSegment(log.segment as Record<string, unknown>)}
                    </code>
                  </td>
                  <td className="text-right tabular-nums">{log.targetCount}</td>
                  <td className="text-right tabular-nums text-emerald-700 font-bold">
                    {log.successCount}
                  </td>
                  <td className="text-right tabular-nums text-gray-500">
                    {log.skippedCount}
                  </td>
                  <td className="text-right tabular-nums text-red-700">
                    {log.failureCount}
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

function summarizeSegment(s: Record<string, unknown>): string {
  const parts: string[] = []
  for (const [k, v] of Object.entries(s)) {
    if (v === undefined || v === null || v === "") continue
    parts.push(`${k}=${String(v)}`)
  }
  return parts.length > 0 ? parts.join(" / ") : "(無条件)"
}

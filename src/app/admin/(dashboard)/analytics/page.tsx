import Link from "next/link"
import { BarChart3, MapPin, Tag, Globe2 } from "lucide-react"
import type { Metadata } from "next"
import {
  fetchFunnel,
  fetchUtmBreakdown,
  fetchCategoryBreakdown,
  fetchPrefectureBreakdown,
  fetchTimeSeries,
  fetchStatusCounts,
  rangeForDays,
  type FunnelStats,
  type TimeSeriesPoint,
} from "@/lib/analytics"
import { LEAD_STATUS_META, type LeadStatus } from "@/lib/line-lead-status"
import { getEventCounts } from "@/lib/track"

export const metadata: Metadata = {
  title: "分析ダッシュボード",
  robots: { index: false, follow: false },
}

const ALLOWED_RANGES = [7, 30, 90] as const
type AllowedRange = (typeof ALLOWED_RANGES)[number]

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function AnalyticsPage({ searchParams }: Props) {
  const params = await searchParams
  const days = parseDays(params.days)
  const range = rangeForDays(days)

  const [funnel, utm, category, prefecture, series, statusCounts, customEvents] = await Promise.all([
    fetchFunnel(range),
    fetchUtmBreakdown(range),
    fetchCategoryBreakdown(range),
    fetchPrefectureBreakdown(range),
    fetchTimeSeries(range),
    fetchStatusCounts(range),
    getEventCounts(days).catch(() => [] as { name: string; count: number }[]),
  ])

  return (
    <div className="space-y-6">
      {/* ヘッダ + 期間切替 */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <BarChart3 className="h-6 w-6 text-primary-500" />
            分析ダッシュボード
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            流入 → 閲覧 → クリック → lead → contact のファネル全体を可視化します。
          </p>
        </div>
        <div className="flex items-center gap-1">
          {ALLOWED_RANGES.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?days=${d}`}
              className={`press px-3 py-1.5 text-xs font-bold border transition ${
                d === days
                  ? "bg-ink-900 text-white border-ink-900"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {d} 日間
            </Link>
          ))}
        </div>
      </div>

      {/* ファネル */}
      <FunnelCard funnel={funnel} />

      {/* 時系列 */}
      <section className="border bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3 section-bar">
          時系列推移（日次）
        </h2>
        <TimeSeriesChart points={series} />
      </section>

      {/* 流入 + カテゴリ + 県 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BreakdownCard
          icon={<Globe2 className="h-4 w-4 text-primary-500" />}
          title="流入ソース別 lead"
          rows={utm.map((u) => ({ label: u.source, count: u.count }))}
          colorClass="bg-blue-100"
        />
        <BreakdownCard
          icon={<Tag className="h-4 w-4 text-primary-500" />}
          title="カテゴリ別 lead"
          rows={category.map((c) => ({ label: localizeCategory(c.category), count: c.count }))}
          colorClass="bg-amber-100"
        />
        <BreakdownCard
          icon={<MapPin className="h-4 w-4 text-primary-500" />}
          title="勤務地県別 lead"
          rows={prefecture.map((p) => ({ label: p.prefecture, count: p.count }))}
          colorClass="bg-emerald-100"
        />
      </div>

      {/* ステータス分布 */}
      <section className="border bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3 section-bar">
          ステータス分布
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
          {(Object.keys(statusCounts) as LeadStatus[]).map((s) => (
            <div
              key={s}
              className={`border p-3 ${LEAD_STATUS_META[s]?.classes ?? "bg-gray-100"}`}
            >
              <p className="text-xs font-bold">{LEAD_STATUS_META[s]?.label ?? s}</p>
              <p className="mt-1 text-2xl font-black tabular-nums">{statusCounts[s] ?? 0}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 独自イベント (13.4) */}
      <section className="border bg-white p-5">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3 section-bar">
          独自イベント ({days} 日間)
        </h2>
        {customEvents.length === 0 ? (
          <p className="text-sm text-gray-500">
            まだイベントが記録されていません。trackEvent() の埋め込み箇所が増えると、
            ここに集計が表示されます。
          </p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {customEvents.map((e) => (
              <div key={e.name} className="border bg-gray-50 p-3">
                <p className="text-xs font-bold text-gray-700">{e.name}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-gray-900">
                  {e.count}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function parseDays(raw: string | undefined): AllowedRange {
  const n = Number(raw)
  if ((ALLOWED_RANGES as readonly number[]).includes(n)) return n as AllowedRange
  return 30
}

// ============================================================
// ファネルカード
// ============================================================

function FunnelCard({ funnel }: { funnel: FunnelStats }) {
  // 元の base = jobViews（最大）。0 のときも 1 件以上の進行があれば 100% 表示。
  const base = Math.max(funnel.jobViews, funnel.applyClicks, funnel.leads, 1)
  const rows: Array<{ label: string; value: number; sub?: string; color: string }> = [
    {
      label: "求人詳細 PV",
      value: funnel.jobViews,
      sub: `${funnel.uniqueViewSessions.toLocaleString()} unique session`,
      color: "bg-blue-500",
    },
    { label: "応募ボタン クリック", value: funnel.applyClicks, color: "bg-cyan-500" },
    { label: "lead 化（フォーム送信）", value: funnel.leads, color: "bg-primary-500" },
    { label: "対応開始（contacted+）", value: funnel.contacted, color: "bg-amber-500" },
    { label: "成約（converted）", value: funnel.converted, color: "bg-emerald-600" },
  ]
  return (
    <section className="border bg-white p-5">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 mb-3 section-bar">
        ファネル
      </h2>
      <ul className="space-y-2">
        {rows.map((r) => {
          const pct = Math.round((r.value / base) * 100)
          return (
            <li key={r.label} className="flex items-center gap-3">
              <div className="w-40 shrink-0">
                <p className="text-xs font-bold text-gray-700">{r.label}</p>
                {r.sub && <p className="text-xs text-gray-500">{r.sub}</p>}
              </div>
              <div className="flex-1 h-7 bg-gray-100 overflow-hidden">
                <div
                  className={`h-full ${r.color} flex items-center px-2 transition-all`}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                >
                  <span className="text-xs font-bold text-white tabular-nums whitespace-nowrap">
                    {r.value.toLocaleString()} ({pct}%)
                  </span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ============================================================
// 時系列 SVG チャート（自前実装、軽量）
// ============================================================

function TimeSeriesChart({ points }: { points: TimeSeriesPoint[] }) {
  if (points.length === 0) {
    return <p className="text-sm text-gray-400">データがありません。</p>
  }
  const W = 800
  const H = 200
  const padX = 40
  const padY = 16

  const maxValue = Math.max(
    1,
    ...points.flatMap((p) => [p.jobViews, p.applyClicks, p.leads])
  )

  function scaleY(v: number) {
    return H - padY - ((H - padY * 2) * v) / maxValue
  }
  function scaleX(i: number) {
    if (points.length === 1) return padX
    return padX + ((W - padX * 2) * i) / (points.length - 1)
  }

  function pathFor(key: "jobViews" | "applyClicks" | "leads"): string {
    return points
      .map((p, i) => {
        const x = scaleX(i)
        const y = scaleY(p[key])
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(" ")
  }

  // x 軸ラベルは max 8 個に間引き
  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H + 40}`} className="w-full min-w-[640px]">
        {/* グリッド */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => {
          const y = padY + (H - padY * 2) * r
          return (
            <line
              key={r}
              x1={padX}
              x2={W - padX}
              y1={y}
              y2={y}
              stroke="#e5e7eb"
              strokeDasharray="2 4"
            />
          )
        })}
        {/* 3 系列 */}
        <path d={pathFor("jobViews")} fill="none" stroke="#3b82f6" strokeWidth={2} />
        <path d={pathFor("applyClicks")} fill="none" stroke="#06b6d4" strokeWidth={2} />
        <path d={pathFor("leads")} fill="none" stroke="#f37524" strokeWidth={2.5} />
        {/* x ラベル */}
        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== points.length - 1) return null
          return (
            <text
              key={p.date}
              x={scaleX(i)}
              y={H + 14}
              fontSize={10}
              fill="#6b7280"
              textAnchor="middle"
            >
              {p.date.slice(5)}
            </text>
          )
        })}
        {/* 凡例 */}
        <g transform={`translate(${padX}, ${H + 28})`}>
          <LegendItem color="#3b82f6" label="PV" x={0} />
          <LegendItem color="#06b6d4" label="クリック" x={70} />
          <LegendItem color="#f37524" label="lead" x={170} />
        </g>
      </svg>
    </div>
  )
}

function LegendItem({ color, label, x }: { color: string; label: string; x: number }) {
  return (
    <g transform={`translate(${x}, 0)`}>
      <rect x={0} y={-8} width={10} height={3} fill={color} />
      <text x={14} y={-3} fontSize={10} fill="#374151">
        {label}
      </text>
    </g>
  )
}

// ============================================================
// 内訳カード（共通）
// ============================================================

function BreakdownCard({
  icon,
  title,
  rows,
  colorClass,
}: {
  icon: React.ReactNode
  title: string
  rows: Array<{ label: string; count: number }>
  colorClass: string
}) {
  const max = rows.length > 0 ? rows[0].count : 1
  return (
    <section className="border bg-white p-4">
      <h3 className="flex items-center gap-1.5 text-sm font-bold text-gray-900 mb-3">
        {icon}
        {title}
      </h3>
      {rows.length === 0 ? (
        <p className="text-xs text-gray-400">データがありません。</p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => {
            const pct = Math.max(2, Math.round((r.count / max) * 100))
            return (
              <li key={r.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-700 w-28 shrink-0 truncate">
                  {r.label}
                </span>
                <span className="flex-1 h-4 bg-gray-100 overflow-hidden relative">
                  <span
                    className={`absolute inset-y-0 left-0 ${colorClass}`}
                    style={{ width: `${pct}%` }}
                  />
                </span>
                <span className="text-xs font-bold tabular-nums w-8 text-right">
                  {r.count}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

const CATEGORY_LABELS_JA: Record<string, string> = {
  construction: "建築・躯体",
  civil: "土木",
  electrical: "電気・設備",
  interior: "内装・仕上げ",
  demolition: "解体・産廃",
  driver: "ドライバー",
  management: "施工管理",
  survey: "測量・設計",
}
function localizeCategory(c: string): string {
  return CATEGORY_LABELS_JA[c] ?? c
}

"use client"

import { useState } from "react"
import type { TimeSeriesPoint } from "@/lib/company-funnel"

/**
 * シンプルな SVG 折れ線チャート（外部ライブラリ不使用）。
 *
 * 3 つの系列（views / applications / hired）を別の y スケール 1 つに正規化して
 * 重ねる。views だけスケールが桁違いに大きくなるので、各系列を自身の最大値で
 * 0〜1 に正規化してから描く。
 */
export function TimeSeriesChart({
  data,
  width = 720,
  height = 200,
}: {
  data: TimeSeriesPoint[]
  width?: number
  height?: number
}) {
  const padding = { top: 12, right: 12, bottom: 24, left: 12 }
  const [hover, setHover] = useState<number | null>(null)

  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center bg-warm-50 border text-sm text-gray-400">
        データがありません
      </div>
    )
  }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const maxView = Math.max(1, ...data.map((d) => d.views))
  const maxApp = Math.max(1, ...data.map((d) => d.applications))
  const maxHire = Math.max(1, ...data.map((d) => d.hired))

  function pointsFor(values: number[], max: number): string {
    return values
      .map((v, i) => {
        const x = padding.left + (i / Math.max(1, values.length - 1)) * innerW
        const y = padding.top + (1 - v / max) * innerH
        return `${x.toFixed(1)},${y.toFixed(1)}`
      })
      .join(" ")
  }

  const viewPts = pointsFor(data.map((d) => d.views), maxView)
  const appPts = pointsFor(data.map((d) => d.applications), maxApp)
  const hirePts = pointsFor(data.map((d) => d.hired), maxHire)

  const xAxisLabels = pickXLabels(data)

  function xFor(i: number) {
    return padding.left + (i / Math.max(1, data.length - 1)) * innerW
  }
  function yFor(v: number, max: number) {
    return padding.top + (1 - v / max) * innerH
  }
  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xSvg = ((e.clientX - rect.left) / rect.width) * width
    const t = (xSvg - padding.left) / Math.max(1, innerW)
    const idx = Math.round(t * (data.length - 1))
    setHover(Math.max(0, Math.min(data.length - 1, idx)))
  }
  const hovered = hover != null ? data[hover] : null
  const tooltipLeftPct = hover != null ? (xFor(hover) / width) * 100 : 0
  const flip = tooltipLeftPct > 60

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full touch-none"
        aria-label="閲覧 / 応募 / 採用の時系列推移"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        {/* グリッド */}
        {[0.25, 0.5, 0.75].map((r) => (
          <line
            key={r}
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + r * innerH}
            y2={padding.top + r * innerH}
            stroke="#e5e7eb"
            strokeDasharray="2 4"
          />
        ))}

        {/* 折れ線 */}
        <polyline
          fill="none"
          stroke="#a78bfa"
          strokeWidth={1.5}
          points={viewPts}
        />
        <polyline
          fill="none"
          stroke="#16a34a"
          strokeWidth={1.8}
          points={appPts}
        />
        <polyline
          fill="none"
          stroke="#f59e0b"
          strokeWidth={2}
          points={hirePts}
        />

        {/* ホバー: ガイド線 + 各系列のドット */}
        {hover != null && hovered && (
          <g pointerEvents="none">
            <line
              x1={xFor(hover)}
              x2={xFor(hover)}
              y1={padding.top}
              y2={padding.top + innerH}
              stroke="#9ca3af"
              strokeWidth={1}
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
            />
            <circle cx={xFor(hover)} cy={yFor(hovered.views, maxView)} r={3.5} fill="#a78bfa" stroke="#fff" strokeWidth={1.2} />
            <circle cx={xFor(hover)} cy={yFor(hovered.applications, maxApp)} r={3.5} fill="#16a34a" stroke="#fff" strokeWidth={1.2} />
            <circle cx={xFor(hover)} cy={yFor(hovered.hired, maxHire)} r={3.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.2} />
          </g>
        )}

        {/* x 軸 ラベル */}
        {xAxisLabels.map((l) => {
          const x = padding.left + (l.idx / Math.max(1, data.length - 1)) * innerW
          return (
            <text
              key={l.idx}
              x={x}
              y={height - 6}
              fontSize={10}
              fill="#9ca3af"
              textAnchor="middle"
            >
              {l.label}
            </text>
          )
        })}
      </svg>

      {/* ツールチップ（HTML オーバーレイ） */}
      {hover != null && hovered && (
        <div
          className="pointer-events-none absolute top-1 z-10 border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md"
          style={{
            left: `${tooltipLeftPct}%`,
            transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
          }}
        >
          <p className="font-bold text-gray-900">{hovered.date}</p>
          <dl className="mt-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-400" />
              <dt className="w-8 text-gray-500">閲覧</dt>
              <dd className="font-bold tabular-nums text-gray-900">{hovered.views.toLocaleString()}</dd>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-600" />
              <dt className="w-8 text-gray-500">応募</dt>
              <dd className="font-bold tabular-nums text-gray-900">{hovered.applications.toLocaleString()}</dd>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
              <dt className="w-8 text-gray-500">採用</dt>
              <dd className="font-bold tabular-nums text-gray-900">{hovered.hired.toLocaleString()}</dd>
            </div>
          </dl>
        </div>
      )}

      {/* 凡例 */}
      <ul className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600">
        <li className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 bg-violet-400" />
          閲覧
          <span className="ml-1 tabular-nums text-gray-400">
            （最大 {maxView.toLocaleString()}）
          </span>
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 bg-emerald-600" />
          応募
          <span className="ml-1 tabular-nums text-gray-400">
            （最大 {maxApp.toLocaleString()}）
          </span>
        </li>
        <li className="flex items-center gap-1">
          <span className="inline-block h-2 w-3 bg-amber-500" />
          採用
          <span className="ml-1 tabular-nums text-gray-400">
            （最大 {maxHire.toLocaleString()}）
          </span>
        </li>
      </ul>
    </div>
  )
}

function pickXLabels(
  data: TimeSeriesPoint[]
): Array<{ idx: number; label: string }> {
  if (data.length === 0) return []
  if (data.length <= 8) {
    return data.map((d, idx) => ({ idx, label: shortDate(d.date) }))
  }
  const step = Math.max(1, Math.floor(data.length / 6))
  const out: Array<{ idx: number; label: string }> = []
  for (let i = 0; i < data.length; i += step) {
    out.push({ idx: i, label: shortDate(data[i].date) })
  }
  // 最後のラベルが抜けないように
  const lastIdx = data.length - 1
  if (out[out.length - 1]?.idx !== lastIdx) {
    out.push({ idx: lastIdx, label: shortDate(data[lastIdx].date) })
  }
  return out
}

function shortDate(iso: string): string {
  // YYYY-MM-DD → M/D
  const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return iso
  return `${Number(m[1])}/${Number(m[2])}`
}

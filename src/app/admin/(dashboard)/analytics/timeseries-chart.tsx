"use client"

import { useRef, useState } from "react"
import type { TimeSeriesPoint } from "@/lib/analytics"

/**
 * 分析ダッシュボードの時系列 SVG チャート（自前実装、軽量）。
 *
 * マウス / タッチで日付にホバーすると、縦のガイド線・各系列のドットと
 * ツールチップ（日付 + PV / クリック / lead の実数）を表示する。
 */

const W = 800
const H = 200
const PAD_X = 40
const PAD_Y = 16

const SERIES = [
  { key: "jobViews", label: "PV", color: "#3b82f6" },
  { key: "applyClicks", label: "クリック", color: "#06b6d4" },
  { key: "leads", label: "lead", color: "#f37524" },
] as const

export function TimeSeriesChart({ points }: { points: TimeSeriesPoint[] }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const [hover, setHover] = useState<number | null>(null)

  if (points.length === 0) {
    return <p className="text-sm text-gray-400">データがありません。</p>
  }

  const maxValue = Math.max(
    1,
    ...points.flatMap((p) => [p.jobViews, p.applyClicks, p.leads]),
  )

  function scaleY(v: number) {
    return H - PAD_Y - ((H - PAD_Y * 2) * v) / maxValue
  }
  function scaleX(i: number) {
    if (points.length === 1) return PAD_X
    return PAD_X + ((W - PAD_X * 2) * i) / (points.length - 1)
  }

  function pathFor(key: (typeof SERIES)[number]["key"]): string {
    return points
      .map((p, i) => {
        const x = scaleX(i)
        const y = scaleY(p[key])
        return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`
      })
      .join(" ")
  }

  // pointer 位置 → 最も近いデータ点の index
  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const xSvg = ((e.clientX - rect.left) / rect.width) * W
    const t = (xSvg - PAD_X) / (W - PAD_X * 2)
    const idx = Math.round(t * (points.length - 1))
    setHover(Math.max(0, Math.min(points.length - 1, idx)))
  }

  // x 軸ラベルは max 8 個に間引き
  const labelStep = Math.max(1, Math.ceil(points.length / 8))

  const hovered = hover != null ? points[hover] : null
  // ツールチップは右側に出し、右端 40% では左側に反転
  const tooltipLeftPct = hover != null ? (scaleX(hover) / W) * 100 : 0
  const flip = tooltipLeftPct > 60

  return (
    <div className="overflow-x-auto">
      <div ref={wrapRef} className="relative min-w-[640px]">
        <svg
          viewBox={`0 0 ${W} ${H + 40}`}
          className="w-full touch-none"
          onPointerMove={handleMove}
          onPointerLeave={() => setHover(null)}
        >
          {/* グリッド */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => {
            const y = PAD_Y + (H - PAD_Y * 2) * r
            return (
              <line
                key={r}
                x1={PAD_X}
                x2={W - PAD_X}
                y1={y}
                y2={y}
                stroke="#e5e7eb"
                strokeDasharray="2 4"
              />
            )
          })}
          {/* 3 系列 */}
          {SERIES.map((s) => (
            <path
              key={s.key}
              d={pathFor(s.key)}
              fill="none"
              stroke={s.color}
              strokeWidth={s.key === "leads" ? 2.5 : 2}
            />
          ))}
          {/* ホバー: ガイド線 + 各系列のドット */}
          {hover != null && hovered && (
            <g pointerEvents="none">
              <line
                x1={scaleX(hover)}
                x2={scaleX(hover)}
                y1={PAD_Y}
                y2={H - PAD_Y}
                stroke="#9ca3af"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              {SERIES.map((s) => (
                <circle
                  key={s.key}
                  cx={scaleX(hover)}
                  cy={scaleY(hovered[s.key])}
                  r={4}
                  fill={s.color}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              ))}
            </g>
          )}
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
          <g transform={`translate(${PAD_X}, ${H + 28})`}>
            {SERIES.map((s, i) => (
              <g key={s.key} transform={`translate(${[0, 70, 170][i]}, 0)`}>
                <rect x={0} y={-8} width={10} height={3} fill={s.color} />
                <text x={14} y={-3} fontSize={10} fill="#374151">
                  {s.label}
                </text>
              </g>
            ))}
          </g>
        </svg>

        {/* ツールチップ（HTML オーバーレイ） */}
        {hover != null && hovered && (
          <div
            className="pointer-events-none absolute top-2 z-10 border border-gray-200 bg-white/95 px-3 py-2 text-xs shadow-md"
            style={{
              left: `${tooltipLeftPct}%`,
              transform: flip ? "translateX(calc(-100% - 10px))" : "translateX(10px)",
            }}
          >
            <p className="font-bold text-gray-900">{hovered.date}</p>
            <dl className="mt-1 space-y-0.5">
              {SERIES.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ backgroundColor: s.color }}
                  />
                  <dt className="w-14 text-gray-500">{s.label}</dt>
                  <dd className="font-bold tabular-nums text-gray-900">
                    {hovered[s.key].toLocaleString()}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  )
}

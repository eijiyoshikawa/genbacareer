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
  if (data.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center bg-warm-50 border text-sm text-gray-400">
        データがありません
      </div>
    )
  }

  const padding = { top: 12, right: 12, bottom: 24, left: 12 }
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

  return (
    <div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="w-full"
        aria-label="閲覧 / 応募 / 採用の時系列推移"
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

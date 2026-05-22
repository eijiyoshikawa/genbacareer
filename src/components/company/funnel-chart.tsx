import type { FunnelStage } from "@/lib/company-funnel"

const BAR_COLORS = [
  "bg-primary-700",
  "bg-primary-600",
  "bg-primary-500",
  "bg-emerald-600",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-orange-500",
  "bg-red-500",
] as const

export function FunnelChart({ stages }: { stages: FunnelStage[] }) {
  const top = stages[0]?.count ?? 0

  return (
    <ol className="space-y-2">
      {stages.map((stage, i) => {
        const ratio = top > 0 ? Math.max(0.02, stage.count / top) : 0
        const conv = stage.conversionFromPrev
        const widthPct = Math.round(ratio * 100)
        return (
          <li key={stage.key} className="grid grid-cols-[88px_1fr_92px] items-center gap-3">
            <span className="text-xs font-bold text-gray-700 text-right">
              {stage.label}
            </span>
            <div className="relative h-6 bg-gray-100">
              <div
                style={{ width: `${widthPct}%` }}
                className={`absolute inset-y-0 left-0 flex items-center justify-end px-2 text-xs font-bold text-white tabular-nums ${
                  BAR_COLORS[i] ?? "bg-gray-500"
                }`}
              >
                {stage.count > 0 && stage.count.toLocaleString()}
              </div>
            </div>
            <span className="text-xs text-gray-500 tabular-nums text-right">
              {conv === null ? (
                <span className="font-bold text-gray-700">
                  {stage.count.toLocaleString()}
                </span>
              ) : (
                <>
                  <span
                    className={
                      conv < 0.1
                        ? "text-red-600 font-bold"
                        : conv < 0.3
                          ? "text-amber-600 font-bold"
                          : "text-emerald-700 font-bold"
                    }
                  >
                    {(conv * 100).toFixed(1)}%
                  </span>
                  <span className="ml-1 text-gray-400">前段比</span>
                </>
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

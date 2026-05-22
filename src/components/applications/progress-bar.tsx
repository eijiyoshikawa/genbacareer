/**
 * 求職者向けの応募進捗バー（5 ステップ）。
 *
 * applied → reviewing → interview → offered → hired
 *
 * rejected は別系統で扱い、バー全体を「不採用」表示にする。
 */

import { Check, X } from "lucide-react"

const STEPS = [
  { key: "applied", label: "応募" },
  { key: "reviewing", label: "選考" },
  { key: "interview", label: "面接" },
  { key: "offered", label: "内定" },
  { key: "hired", label: "採用" },
] as const

const STEP_INDEX: Record<string, number> = {
  applied: 0,
  reviewing: 1,
  interview: 2,
  offered: 3,
  hired: 4,
}

export function ApplicationProgressBar({
  status,
  size = "md",
}: {
  status: string
  size?: "sm" | "md"
}) {
  const isRejected = status === "rejected"
  const currentIndex = isRejected ? -1 : STEP_INDEX[status] ?? 0
  const dotSize = size === "sm" ? "h-4 w-4" : "h-6 w-6"
  const lineHeight = size === "sm" ? "h-0.5" : "h-1"

  if (isRejected) {
    return (
      <div className="flex items-center gap-2">
        <span className={`flex ${dotSize} items-center justify-center bg-gray-300`}>
          <X className="h-3 w-3 text-gray-600" strokeWidth={3} />
        </span>
        <span className="text-xs font-bold text-gray-500">不採用</span>
      </div>
    )
  }

  return (
    <ol className="grid grid-cols-5 gap-0 items-start">
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex
        const isHired = step.key === "hired" && isCurrent
        const dotClass = isDone
          ? "bg-primary-600 text-white"
          : isCurrent
            ? isHired
              ? "bg-emerald-500 text-white ring-4 ring-emerald-200"
              : "bg-primary-600 text-white ring-4 ring-primary-200"
            : "bg-gray-200 text-gray-400"
        const labelClass = isDone
          ? "text-primary-700 font-bold"
          : isCurrent
            ? isHired
              ? "text-emerald-700 font-bold"
              : "text-primary-700 font-bold"
            : "text-gray-400"
        return (
          <li key={step.key} className="relative flex flex-col items-center">
            {i < STEPS.length - 1 && (
              <span
                aria-hidden
                className={`absolute top-[11px] left-[calc(50%+12px)] right-[calc(-50%+12px)] ${lineHeight} ${
                  i < currentIndex ? "bg-primary-500" : "bg-gray-200"
                }`}
              />
            )}
            <span
              className={`relative z-10 flex ${dotSize} items-center justify-center text-xs font-bold ${dotClass}`}
            >
              {isDone ? (
                <Check className="h-3 w-3" strokeWidth={3} />
              ) : (
                <span>{i + 1}</span>
              )}
            </span>
            <span className={`mt-1.5 text-xs ${labelClass}`}>
              {step.label}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

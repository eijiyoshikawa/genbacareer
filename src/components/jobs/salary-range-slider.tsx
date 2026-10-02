"use client"

import { useState } from "react"

/**
 * 月給レンジのスライダー（万円）。
 * 親の <form action="/jobs"> 内に置く想定。値は hidden input
 * name="salary_min" / "salary_max"（万円）に同期。0 のときは未指定として空送信。
 */
export function SalaryRangeSlider({
  initialMin,
  initialMax,
}: {
  initialMin?: string
  initialMax?: string
}) {
  const MAX = 100 // 上限スライダーの最大（万円）。100 = 上限なし
  const [min, setMin] = useState<number>(Number(initialMin) || 0)
  const [max, setMax] = useState<number>(Number(initialMax) || 0)

  // 表示用ラベル
  const minLabel = min > 0 ? `${min}万円` : "下限なし"
  const maxLabel = max > 0 && max < MAX ? `${max}万円` : "上限なし"

  return (
    <div className="pt-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-600">月給（万円）</span>
        <span className="text-xs font-bold text-primary-700">
          {minLabel} 〜 {maxLabel}
        </span>
      </div>

      {/* 送信用 hidden（0 のときは空＝未指定） */}
      <input type="hidden" name="salary_min" value={min > 0 ? String(min) : ""} />
      <input
        type="hidden"
        name="salary_max"
        value={max > 0 && max < MAX ? String(max) : ""}
      />

      <div className="mt-2 space-y-2">
        <label className="block">
          <span className="text-[11px] text-gray-500">下限：{minLabel}</span>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={min}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMin(v)
              if (max > 0 && v > max) setMax(v)
            }}
            className="mt-1 w-full accent-primary-600"
          />
        </label>
        <label className="block">
          <span className="text-[11px] text-gray-500">上限：{maxLabel}</span>
          <input
            type="range"
            min={0}
            max={MAX}
            step={5}
            value={max}
            onChange={(e) => {
              const v = Number(e.target.value)
              setMax(v)
              if (v > 0 && v < min) setMin(v)
            }}
            className="mt-1 w-full accent-primary-600"
          />
        </label>
      </div>
    </div>
  )
}

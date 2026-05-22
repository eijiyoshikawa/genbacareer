"use client"

import { CONSTRUCTION_JOB_GROUPS } from "@/lib/registration/construction-jobs"
import { Check } from "lucide-react"

/**
 * 建設業 9 カテゴリ + 配下の細分職種を選ばせるアコーディオン式ピッカー。
 *
 * - 上位カテゴリのみ選んでも OK (細分を選ぶと自動で上位も選択扱い)
 * - 複数選択可
 * - 「その他」は最下部
 */
export function ConstructionJobPicker({
  selectedSubcategories,
  onChange,
}: {
  selectedSubcategories: string[]
  onChange: (next: string[]) => void
}) {
  const toggle = (slug: string) => {
    if (selectedSubcategories.includes(slug)) {
      onChange(selectedSubcategories.filter((s) => s !== slug))
    } else {
      onChange([...selectedSubcategories, slug])
    }
  }

  return (
    <div className="space-y-2">
      {CONSTRUCTION_JOB_GROUPS.map((group) => {
        const selectedInGroup = group.subcategories.filter((s) =>
          selectedSubcategories.includes(s.value),
        )
        const isExpanded = selectedInGroup.length > 0

        return (
          <details
            key={group.category}
            open={isExpanded}
            className="border border-gray-200 bg-white overflow-hidden"
          >
            <summary className="press cursor-pointer list-none px-3 py-2.5 flex items-center justify-between hover:bg-warm-50">
              <div className="min-w-0 flex-1">
                <p className="font-bold text-sm text-gray-900">
                  {group.label}
                  {selectedInGroup.length > 0 && (
                    <span className="ml-2 inline-flex items-center bg-primary-100 text-primary-700 text-[10px] font-bold px-1.5 py-0.5">
                      {selectedInGroup.length} 件選択
                    </span>
                  )}
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">{group.tagline}</p>
              </div>
              <span className="text-gray-400 text-sm ml-2">▾</span>
            </summary>
            <div className="border-t border-gray-100 p-2 bg-warm-50/40">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {group.subcategories.map((sub) => {
                  const checked = selectedSubcategories.includes(sub.value)
                  return (
                    <li key={sub.value}>
                      <button
                        type="button"
                        onClick={() => toggle(sub.value)}
                        className={`press w-full flex items-center gap-2 px-3 py-2 text-sm text-left transition ${
                          checked
                            ? "bg-primary-600 text-white"
                            : "bg-white text-gray-800 hover:bg-primary-50 hover:text-primary-700 border border-gray-200"
                        }`}
                      >
                        {checked && <Check className="h-3.5 w-3.5 shrink-0" />}
                        <span className="flex-1">{sub.label}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </details>
        )
      })}
    </div>
  )
}

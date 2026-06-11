"use client"

import { useState } from "react"
import { SlidersHorizontal, X } from "lucide-react"

/**
 * こだわり条件の複数チェック一括選択モーダル（リクナビ風）。
 * 親の <form action="/jobs"> 内に置く想定。選択値は hidden input
 * name="conditions"（カンマ区切り）に同期し、フォーム送信で絞り込む。
 */
export function ConditionFilterModal({
  options,
  initial,
}: {
  options: string[]
  initial: string[]
}) {
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<string[]>(initial)

  const toggle = (v: string) =>
    setSelected((prev) =>
      prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]
    )

  return (
    <div className="pt-3">
      <span className="block text-xs font-medium text-gray-600">
        こだわり条件
      </span>
      {/* hidden: フォーム送信用（カンマ区切り） */}
      <input type="hidden" name="conditions" value={selected.join(",")} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 flex w-full items-center justify-between border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:border-primary-500"
      >
        <span className="inline-flex items-center gap-1.5">
          <SlidersHorizontal className="h-4 w-4 text-primary-500" />
          {selected.length > 0 ? `${selected.length}件選択中` : "条件を選ぶ"}
        </span>
        <span className="text-xs text-gray-400">開く</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="relative z-10 max-h-[80vh] w-full max-w-lg overflow-auto bg-white shadow-xl">
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
              <h3 className="text-sm font-bold text-gray-900">こだわり条件</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="閉じる"
                className="text-gray-400 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 p-4">
              {options.map((o) => {
                const on = selected.includes(o)
                return (
                  <button
                    key={o}
                    type="button"
                    onClick={() => toggle(o)}
                    className={`flex items-center gap-2 border px-3 py-2 text-left text-sm transition ${
                      on
                        ? "border-primary-500 bg-primary-50 text-primary-700 font-bold"
                        : "border-gray-200 text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 shrink-0 items-center justify-center border ${
                        on ? "border-primary-600 bg-primary-600 text-white" : "border-gray-300"
                      }`}
                    >
                      {on ? "✓" : ""}
                    </span>
                    {o}
                  </button>
                )
              })}
            </div>
            <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3">
              <button
                type="button"
                onClick={() => setSelected([])}
                className="text-xs text-gray-500 hover:text-primary-700"
              >
                クリア
              </button>
              {/* 親フォームを送信して絞り込む */}
              <button
                type="submit"
                className="bg-primary-600 px-5 py-2 text-sm font-extrabold text-white hover:bg-primary-700"
              >
                この条件で探す
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

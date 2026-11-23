"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Search } from "lucide-react"

type Suggestion = {
  type: "keyword" | "category" | "prefecture" | "job"
  label: string
  href: string
}

const TYPE_LABEL: Record<Suggestion["type"], string> = {
  keyword: "キーワード",
  category: "職種",
  prefecture: "勤務地",
  job: "求人",
}

/**
 * /jobs 検索ボックス用のオートコンプリート。
 * 入力途中で /api/search-suggest を叩き、候補を出す。
 * フォーム送信（Enter / ボタン）は従来どおり /jobs?q= に GET 送信。
 */
export function SearchAutocomplete({ defaultValue = "" }: { defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue)
  const [items, setItems] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // 外側クリックで閉じる
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocClick)
    return () => document.removeEventListener("mousedown", onDocClick)
  }, [])

  // デバウンス付きフェッチ
  useEffect(() => {
    const q = value.trim()
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      if (q.length < 1) {
        setItems([])
        setOpen(false)
        return
      }
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, {
          signal: ctrl.signal,
        })
        if (!res.ok) return
        const data = (await res.json()) as { suggestions: Suggestion[] }
        setItems(data.suggestions ?? [])
        setOpen(true)
      } catch {
        /* abort / network: 無視 */
      }
    }, 200)
    return () => {
      clearTimeout(t)
      ctrl.abort()
    }
  }, [value])

  return (
    <div ref={boxRef} className="relative flex-1">
      <Search className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        name="q"
        autoComplete="off"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => items.length > 0 && setOpen(true)}
        placeholder="職種・地域・キーワードで検索"
        className="w-full border-0 bg-white py-3 pl-10 pr-4 text-sm font-medium text-gray-900 placeholder:text-gray-400 shadow-sm focus:ring-2 focus:ring-primary-400"
      />
      {open && items.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-80 overflow-auto border border-gray-200 bg-white shadow-lg">
          {items.map((s, i) => (
            <li key={`${s.type}-${i}`}>
              <button
                type="button"
                onMouseDown={(e) => {
                  // blur より先に発火させる
                  e.preventDefault()
                  setOpen(false)
                  router.push(s.href)
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-800 hover:bg-primary-50"
              >
                <span className="shrink-0 bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">
                  {TYPE_LABEL[s.type]}
                </span>
                <span className="truncate">{s.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

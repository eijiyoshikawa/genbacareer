"use client"

import { useState } from "react"
import { CalendarClock, Plus, Trash2, Star } from "lucide-react"

export type SchedulingUrl = {
  name: string
  url: string
  primary?: boolean
}

interface Props {
  value: SchedulingUrl[]
  onChange: (next: SchedulingUrl[]) => void
}

/**
 * 面接調整ツール URL の編集 UI。
 * Google Calendar / Calendly / TimeRex / 役員専用ツール 等を最大 10 件登録可能。
 */
export function SchedulingUrlsEditor({ value, onChange }: Props) {
  const [draft, setDraft] = useState<SchedulingUrl>({ name: "", url: "" })

  function add() {
    const name = draft.name.trim()
    const url = draft.url.trim()
    if (!name || !url) return
    if (!/^https?:\/\//i.test(url)) return
    if (value.length >= 10) return
    const next = [...value, { name, url }]
    // primary が未設定なら最初の要素を primary に
    if (!next.some((u) => u.primary)) next[0].primary = true
    onChange(next)
    setDraft({ name: "", url: "" })
  }

  function remove(idx: number) {
    const next = value.filter((_, i) => i !== idx)
    if (next.length > 0 && !next.some((u) => u.primary)) {
      next[0].primary = true
    }
    onChange(next)
  }

  function setPrimary(idx: number) {
    onChange(value.map((u, i) => ({ ...u, primary: i === idx })))
  }

  function update(idx: number, patch: Partial<SchedulingUrl>) {
    onChange(value.map((u, i) => (i === idx ? { ...u, ...patch } : u)))
  }

  return (
    <section className="border bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
        <CalendarClock className="h-5 w-5 text-primary-500" />
        面接調整ツール URL
      </h3>
      <p className="mt-1 text-xs text-gray-500">
        Google Calendar / Calendly / TimeRex / 役員専用予約ツール などを登録できます。
        応募者管理画面でクリック 1 つで案内できるようになります（最大 10 件）。
      </p>

      <ul className="mt-3 space-y-2">
        {value.length === 0 && (
          <li className="text-xs text-gray-400">まだ登録がありません。</li>
        )}
        {value.map((u, i) => (
          <li
            key={i}
            className="flex items-center gap-2 border bg-warm-50 px-2 py-2"
          >
            <button
              type="button"
              onClick={() => setPrimary(i)}
              className={`shrink-0 p-1 ${
                u.primary ? "text-amber-500" : "text-gray-300 hover:text-amber-400"
              }`}
              aria-label="メインに設定"
              title="メインに設定"
            >
              <Star className="h-3.5 w-3.5" fill={u.primary ? "currentColor" : "none"} />
            </button>
            <input
              type="text"
              value={u.name}
              onChange={(e) => update(i, { name: e.target.value })}
              maxLength={60}
              placeholder="表示名（例: Google Calendar）"
              className="w-40 shrink-0 border px-2 py-1 text-xs"
            />
            <input
              type="url"
              value={u.url}
              onChange={(e) => update(i, { url: e.target.value })}
              maxLength={500}
              placeholder="https://calendar.app.google.com/..."
              className="flex-1 min-w-0 border px-2 py-1 text-xs font-mono"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 p-1 text-gray-400 hover:text-red-600"
              aria-label="削除"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>

      {value.length < 10 && (
        <div className="mt-3 flex items-center gap-2 border border-dashed border-primary-300 bg-primary-50/30 px-2 py-2">
          <input
            type="text"
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            maxLength={60}
            placeholder="表示名"
            className="w-40 shrink-0 border px-2 py-1 text-xs"
          />
          <input
            type="url"
            value={draft.url}
            onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            maxLength={500}
            placeholder="https://..."
            className="flex-1 min-w-0 border px-2 py-1 text-xs font-mono"
          />
          <button
            type="button"
            onClick={add}
            className="press inline-flex shrink-0 items-center gap-1 bg-primary-600 hover:bg-primary-700 px-2 py-1 text-xs font-bold text-white"
          >
            <Plus className="h-3 w-3" />
            追加
          </button>
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500 leading-relaxed">
        ★ マークが付いた URL がメインとして応募者管理画面の初期候補に表示されます。
      </p>
    </section>
  )
}

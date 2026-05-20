"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, ToggleLeft, ToggleRight } from "lucide-react"

interface BlocklistItem {
  id: string
  keyword: string
  scope: string
  note: string | null
  enabled: boolean
  hitCount: number
  updatedAt: string
}

const SCOPE_OPTIONS = [
  { value: "any", label: "全部" },
  { value: "title", label: "求人タイトル" },
  { value: "description", label: "求人説明" },
  { value: "company", label: "会社名" },
]

export function BlocklistTable({ items }: { items: BlocklistItem[] }) {
  const router = useRouter()
  const [adding, setAdding] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [scope, setScope] = useState("any")
  const [note, setNote] = useState("")
  const [error, setError] = useState("")
  const [busyId, setBusyId] = useState<string | null>(null)

  async function handleAdd() {
    if (!keyword.trim()) {
      setError("キーワードを入力してください")
      return
    }
    setAdding(true)
    setError("")
    try {
      const res = await fetch("/api/admin/blocklists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          keyword: keyword.trim(),
          scope,
          note: note.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error ?? "追加に失敗しました")
        return
      }
      setKeyword("")
      setNote("")
      setScope("any")
      router.refresh()
    } catch {
      setError("通信エラー")
    } finally {
      setAdding(false)
    }
  }

  async function toggleEnabled(item: BlocklistItem) {
    setBusyId(item.id)
    try {
      await fetch(`/api/admin/blocklists/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !item.enabled }),
      })
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  async function deleteItem(item: BlocklistItem) {
    if (!confirm(`「${item.keyword}」を削除しますか？`)) return
    setBusyId(item.id)
    try {
      await fetch(`/api/admin/blocklists/${item.id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* 追加フォーム */}
      <div className="border bg-white p-5 shadow-sm">
        <h2 className="text-sm font-bold text-gray-900 mb-3">新規追加</h2>
        <div className="grid gap-3 sm:grid-cols-[1fr_140px_2fr_auto]">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={100}
            placeholder="キーワード"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="border border-gray-300 px-2 py-2 text-sm"
          >
            {SCOPE_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={500}
            placeholder="メモ (任意): なぜこの語をブロックするか"
            className="border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="inline-flex items-center gap-1 bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            追加
          </button>
        </div>
        {error && (
          <p className="mt-2 text-sm text-red-600">{error}</p>
        )}
      </div>

      {/* 一覧 */}
      <div className="border bg-white shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                キーワード
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                対象
              </th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-600">
                メモ
              </th>
              <th className="px-3 py-2 text-right text-xs font-bold text-gray-600">
                ヒット
              </th>
              <th className="px-3 py-2 text-center text-xs font-bold text-gray-600">
                状態
              </th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-sm text-gray-400">
                  まだ登録されていません
                </td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id} className={!it.enabled ? "bg-gray-50 opacity-60" : ""}>
                  <td className="px-3 py-2 font-medium text-gray-900">
                    {it.keyword}
                  </td>
                  <td className="px-3 py-2 text-gray-600">
                    {SCOPE_OPTIONS.find((s) => s.value === it.scope)?.label ?? it.scope}
                  </td>
                  <td className="px-3 py-2 text-gray-500 text-xs">
                    {it.note ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                    {it.hitCount.toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => toggleEnabled(it)}
                      disabled={busyId === it.id}
                      className="inline-flex items-center"
                      aria-pressed={it.enabled}
                      aria-label={it.enabled ? "無効化" : "有効化"}
                    >
                      {it.enabled ? (
                        <ToggleRight className="h-6 w-6 text-green-600" />
                      ) : (
                        <ToggleLeft className="h-6 w-6 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => deleteItem(it)}
                      disabled={busyId === it.id}
                      aria-label="削除"
                      className="text-gray-400 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

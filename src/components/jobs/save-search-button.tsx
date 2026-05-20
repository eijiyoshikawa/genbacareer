"use client"

import { useState } from "react"
import { Bell } from "lucide-react"

type Props = {
  enabled: boolean
  filters: {
    prefecture?: string | null
    category?: string | null
    employmentType?: string | null
    salaryMin?: number | null
    keyword?: string | null
  }
}

export function SaveSearchButton({ enabled, filters }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!enabled) return null

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch("/api/users/me/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...filters, name }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(data?.error ?? "保存に失敗しました")
      }
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        setName("")
      }, 1200)
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存に失敗しました")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
      >
        <Bell className="h-4 w-4" />
        この条件を保存
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-2 w-72 rounded-lg border bg-white p-4 shadow-lg">
          {done ? (
            <p className="text-sm text-green-700">保存しました</p>
          ) : (
            <>
              <label className="block text-xs font-medium text-gray-700">
                条件名
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例: 東京の運送ドライバー"
                maxLength={100}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs text-gray-600 hover:text-gray-900"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={save}
                  disabled={!name.trim() || saving}
                  className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {saving ? "保存中..." : "保存"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

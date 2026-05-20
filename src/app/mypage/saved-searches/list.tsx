"use client"

import { useState, useTransition } from "react"
import Link from "next/link"

type SavedSearch = {
  id: string
  name: string
  prefecture: string | null
  category: string | null
  employmentType: string | null
  salaryMin: number | null
  keyword: string | null
  alertEnabled: boolean
}

export function SavedSearchList({ initial }: { initial: SavedSearch[] }) {
  const [items, setItems] = useState(initial)
  const [pending, startTransition] = useTransition()

  function toggleAlert(id: string, next: boolean) {
    startTransition(async () => {
      setItems((prev) =>
        prev.map((s) => (s.id === id ? { ...s, alertEnabled: next } : s))
      )
      await fetch(`/api/users/me/saved-searches/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertEnabled: next }),
      }).catch(() => {
        setItems((prev) =>
          prev.map((s) => (s.id === id ? { ...s, alertEnabled: !next } : s))
        )
      })
    })
  }

  function remove(id: string) {
    if (!confirm("この保存条件を削除しますか？")) return
    startTransition(async () => {
      const prev = items
      setItems((it) => it.filter((s) => s.id !== id))
      const res = await fetch(`/api/users/me/saved-searches/${id}`, {
        method: "DELETE",
      }).catch(() => null)
      if (!res || !res.ok) setItems(prev)
    })
  }

  function buildJobsUrl(s: SavedSearch) {
    const sp = new URLSearchParams()
    if (s.prefecture) sp.set("prefecture", s.prefecture)
    if (s.category) sp.set("category", s.category)
    if (s.employmentType) sp.set("employment_type", s.employmentType)
    if (s.salaryMin != null) sp.set("salary_min", String(s.salaryMin))
    if (s.keyword) sp.set("q", s.keyword)
    return `/jobs?${sp.toString()}`
  }

  return (
    <ul className="mt-6 space-y-3">
      {items.map((s) => (
        <li
          key={s.id}
          className="rounded-lg border bg-white p-5 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0">
            <p className="text-base font-semibold text-gray-900">{s.name}</p>
            <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500">
              {s.prefecture && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5">
                  {s.prefecture}
                </span>
              )}
              {s.category && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5">
                  {s.category}
                </span>
              )}
              {s.employmentType && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5">
                  {s.employmentType}
                </span>
              )}
              {s.salaryMin != null && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5">
                  年収 {s.salaryMin.toLocaleString()} 以上
                </span>
              )}
              {s.keyword && (
                <span className="rounded bg-gray-100 px-1.5 py-0.5">
                  {s.keyword}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={s.alertEnabled}
                disabled={pending}
                onChange={(e) => toggleAlert(s.id, e.target.checked)}
              />
              新着通知
            </label>
            <Link
              href={buildJobsUrl(s)}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              開く
            </Link>
            <button
              type="button"
              onClick={() => remove(s.id)}
              disabled={pending}
              className="text-sm text-red-600 hover:text-red-700"
            >
              削除
            </button>
          </div>
        </li>
      ))}
    </ul>
  )
}

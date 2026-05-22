"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Bookmark, Loader2, Check } from "lucide-react"

export function SaveSearchButton({
  loggedIn,
  defaultName,
  q,
  prefecture,
  city,
  category,
  employmentType,
  salaryMin,
  source,
}: {
  loggedIn: boolean
  defaultName: string
  q?: string
  prefecture?: string
  city?: string
  category?: string
  employmentType?: string
  salaryMin?: number
  source?: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(defaultName)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState("")

  async function save() {
    setSubmitting(true)
    setError("")
    try {
      const res = await fetch("/api/users/me/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || defaultName,
          q: q || null,
          prefecture: prefecture || null,
          city: city || null,
          category: category || null,
          employmentType: employmentType || null,
          salaryMin: salaryMin ?? null,
          source: source || null,
          alertEnabled: true,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "保存に失敗しました")
        return
      }
      setDone(true)
      setTimeout(() => {
        setOpen(false)
        setDone(false)
        router.refresh()
      }, 1200)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setSubmitting(false)
    }
  }

  if (!loggedIn) {
    return (
      <a
        href={`/login?callbackUrl=${encodeURIComponent("/mypage/saved-searches")}`}
        className="press inline-flex items-center gap-1 border border-primary-300 bg-white hover:bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700"
      >
        <Bookmark className="h-3.5 w-3.5" />
        ログインして検索を保存
      </a>
    )
  }

  return (
    <div className="inline-block relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="press inline-flex items-center gap-1 border border-primary-300 bg-white hover:bg-primary-50 px-3 py-1.5 text-xs font-bold text-primary-700"
      >
        <Bookmark className="h-3.5 w-3.5" />
        この条件を保存
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 w-72 border bg-white p-3 shadow-lg">
          <p className="text-xs font-bold text-gray-700">保存する名前</p>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="mt-1 block w-full border px-2 py-1.5 text-sm"
            placeholder={defaultName}
          />
          {error && (
            <p className="mt-2 text-xs text-red-600">{error}</p>
          )}
          {done && (
            <p className="mt-2 flex items-center gap-1 text-xs text-emerald-700">
              <Check className="h-3 w-3" />
              保存しました
            </p>
          )}
          <div className="mt-2 flex items-center gap-2">
            <button
              type="button"
              disabled={submitting || done}
              onClick={save}
              className="inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Bookmark className="h-3 w-3" />
              )}
              保存
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              キャンセル
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            新着求人があれば通知をお送りします。
          </p>
        </div>
      )}
    </div>
  )
}

"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function ReportResolveActions({ reportId }: { reportId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [resolution, setResolution] = useState("")
  const [showInput, setShowInput] = useState<"resolved" | "dismissed" | null>(null)
  const [error, setError] = useState("")

  async function submit(action: "resolved" | "dismissed") {
    setError("")
    try {
      const res = await fetch(`/api/admin/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: action,
          resolution: resolution.trim() || null,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "更新に失敗しました")
        return
      }
      startTransition(() => {
        router.refresh()
      })
    } catch {
      setError("通信エラーが発生しました")
    }
  }

  if (showInput) {
    return (
      <div className="flex w-full max-w-sm flex-col gap-2 sm:max-w-md">
        <textarea
          value={resolution}
          onChange={(e) => setResolution(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="対応メモ（任意・500 文字まで）"
          className="border border-gray-300 px-2 py-1 text-xs"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => submit(showInput)}
            className={`px-3 py-1 text-xs font-medium text-white ${
              showInput === "resolved"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-500 hover:bg-gray-600"
            } disabled:opacity-50`}
          >
            {showInput === "resolved" ? "対応済みに" : "却下"}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setShowInput(null)
              setResolution("")
              setError("")
            }}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => setShowInput("resolved")}
        className="border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50"
      >
        対応済みに
      </button>
      <button
        type="button"
        onClick={() => setShowInput("dismissed")}
        className="border border-gray-400 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
      >
        却下
      </button>
    </div>
  )
}

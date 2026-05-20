"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function ReviewModerationActions({ reviewId }: { reviewId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function moderate(action: "approved" | "rejected") {
    setError("")
    const note =
      action === "rejected"
        ? window.prompt("却下理由 (任意): 投稿者には開示されません")
        : null
    try {
      const res = await fetch(`/api/admin/company-reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: action, moderationNote: note }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? "更新に失敗しました")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError("通信エラー")
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => moderate("approved")}
          disabled={pending}
          className="border border-green-600 px-3 py-1 text-xs font-medium text-green-700 hover:bg-green-50 disabled:opacity-50"
        >
          公開
        </button>
        <button
          type="button"
          onClick={() => moderate("rejected")}
          disabled={pending}
          className="border border-gray-400 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          却下
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

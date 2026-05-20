"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function JobModerationActions({
  jobId,
  status,
}: {
  jobId: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: "suspend" | "approve" | "close") {
    const note =
      action === "suspend"
        ? prompt("停止理由（任意・管理メモに保存）") ?? ""
        : ""
    startTransition(async () => {
      setError(null)
      const res = await fetch(`/api/admin/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, note: note || undefined }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        setError(data?.error ?? "更新に失敗しました")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "active" && (
        <button
          type="button"
          onClick={() => run("approve")}
          disabled={pending}
          className="rounded-md bg-green-600 px-2 py-0.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          公開
        </button>
      )}
      {status !== "suspended" && (
        <button
          type="button"
          onClick={() => run("suspend")}
          disabled={pending}
          className="rounded-md border border-red-300 bg-white px-2 py-0.5 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          停止
        </button>
      )}
      {status !== "closed" && (
        <button
          type="button"
          onClick={() => run("close")}
          disabled={pending}
          className="rounded-md border border-gray-300 bg-white px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          終了
        </button>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

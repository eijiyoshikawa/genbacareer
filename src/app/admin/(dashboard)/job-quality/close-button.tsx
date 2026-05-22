"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

/**
 * 求人を不適切としてクローズするボタン。
 * POST /api/admin/jobs/[id]/close を叩いて status="closed" に変更。
 */
export function CloseJobButton({ jobId }: { jobId: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClose() {
    if (!confirm("この求人を不適切としてクローズしますか？")) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "admin manual close" }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? `HTTP ${res.status}`)
      }
      setDone(true)
      // 一覧を再取得
      router.refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200">
        クローズ済み
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClose}
        disabled={busy}
        className="press inline-flex items-center px-3 py-1.5 text-xs font-medium border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {busy ? "処理中..." : "不適切でクローズ"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  )
}

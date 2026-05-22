"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Hash, Layers, Loader2 } from "lucide-react"

interface BackfillResult {
  processed: number
}
interface MergeResult {
  groupsProcessed: number
  closed: number
}

export function SyncMaintenanceRunner() {
  const router = useRouter()
  const [busy, setBusy] = useState<"backfill" | "merge" | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [error, setError] = useState("")

  async function backfill() {
    setBusy("backfill")
    setError("")
    try {
      const res = await fetch("/api/admin/dedupe/backfill", { method: "POST" })
      if (!res.ok) {
        setError("バックフィル失敗")
        return
      }
      const data = (await res.json()) as BackfillResult
      setHistory((p) => [`dedupeKey backfill: ${data.processed} 件処理`, ...p].slice(0, 10))
      router.refresh()
    } catch {
      setError("通信エラー")
    } finally {
      setBusy(null)
    }
  }

  async function merge() {
    setBusy("merge")
    setError("")
    try {
      const res = await fetch("/api/admin/dedupe/merge", { method: "POST" })
      if (!res.ok) {
        setError("マージ失敗")
        return
      }
      const data = (await res.json()) as MergeResult
      setHistory((p) =>
        [`merge: ${data.groupsProcessed} グループ → ${data.closed} 件閉じた`, ...p].slice(
          0,
          10
        )
      )
      router.refresh()
    } catch {
      setError("通信エラー")
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={backfill}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          {busy === "backfill" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Hash className="h-4 w-4" />
          )}
          dedupeKey backfill (100 件)
        </button>
        <button
          type="button"
          onClick={merge}
          disabled={!!busy}
          className="inline-flex items-center gap-1.5 bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {busy === "merge" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Layers className="h-4 w-4" />
          )}
          重複マージ実行 (50 group)
        </button>
      </div>
      <p className="text-xs text-gray-500">
        Tip: 先に「dedupeKey backfill」を全 active 求人に当ててから、「重複マージ」を実行してください。
        重複と判定された求人は status=closed + dedupedTo に代表 id がセットされます。
      </p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {history.length > 0 && (
        <ul className="border-t pt-2 text-xs text-gray-600 space-y-1">
          {history.map((h, i) => (
            <li key={i}>· {h}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

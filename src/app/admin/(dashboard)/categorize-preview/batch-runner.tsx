"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Play, Loader2 } from "lucide-react"

interface BatchResult {
  processed: number
  highConfidence: number
  remaining: "more" | 0
}

export function CategorizeBatchRunner() {
  const router = useRouter()
  const [running, setRunning] = useState(false)
  const [results, setResults] = useState<BatchResult[]>([])
  const [error, setError] = useState("")

  async function runOnce() {
    setRunning(true)
    setError("")
    try {
      const res = await fetch("/api/admin/categorize/run-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 50 }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? "分類に失敗しました")
        return
      }
      const data = (await res.json()) as BatchResult
      setResults((prev) => [data, ...prev].slice(0, 10))
      router.refresh()
    } catch {
      setError("通信エラー")
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="border bg-white p-5 shadow-sm space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-gray-900">
            未分類求人の一括分類
          </h2>
          <p className="mt-0.5 text-xs text-gray-500">
            まだ JobCategoryClassification が無い active 求人を 50 件取り、
            ルールベースで分類して記録します。
          </p>
        </div>
        <button
          type="button"
          onClick={runOnce}
          disabled={running}
          className="inline-flex items-center gap-1.5 bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {running ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {running ? "実行中..." : "50 件を分類"}
        </button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {results.length > 0 && (
        <div className="border-t pt-3">
          <p className="text-xs font-bold text-gray-700 mb-2">実行履歴 (新しい順)</p>
          <ul className="space-y-1 text-xs">
            {results.map((r, i) => (
              <li key={i} className="flex items-center justify-between text-gray-700">
                <span>
                  処理 {r.processed} 件 (高信頼 {r.highConfidence} 件)
                </span>
                <span className="text-gray-400">
                  {r.remaining === "more" ? "まだ残あり" : "完了"}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

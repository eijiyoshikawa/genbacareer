"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { XCircle } from "lucide-react"

export function DeclineScoutButton({ scoutId }: { scoutId: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    if (!confirm("このスカウトを辞退しますか？")) return
    setLoading(true)
    setError("")
    try {
      const res = await fetch(`/api/scouts/${scoutId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decline",
          declineReason: reason.trim() || undefined,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "辞退処理に失敗しました")
        return
      }
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 border border-gray-300 bg-white px-4 py-3 text-sm text-gray-500 hover:bg-warm-50"
      >
        <XCircle className="h-4 w-4" /> 辞退
      </button>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 border border-warm-200 bg-warm-50 p-3 sm:max-w-sm">
      <label className="text-xs font-medium text-gray-700" htmlFor="decline-reason">
        辞退理由 (任意)
      </label>
      <input
        id="decline-reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={200}
        placeholder="例: 別の企業へ応募予定のため"
        className="border border-gray-300 px-2 py-1 text-sm"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={loading}
          className="flex-1 bg-gray-500 px-3 py-2 text-sm font-medium text-white hover:bg-gray-600 disabled:opacity-50"
        >
          {loading ? "送信中..." : "辞退を確定"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setReason("")
            setError("")
          }}
          className="border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-warm-50"
        >
          キャンセル
        </button>
      </div>
    </div>
  )
}

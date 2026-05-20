"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function WithdrawButton({ applicationId }: { applicationId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handle() {
    if (!confirm("この応募を取り下げますか？この操作は取り消せません。")) return
    startTransition(async () => {
      setError(null)
      try {
        const res = await fetch(`/api/applications/${applicationId}`, {
          method: "DELETE",
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as
            | { error?: string }
            | null
          throw new Error(data?.error ?? "取り下げに失敗しました")
        }
        router.refresh()
      } catch (e) {
        setError(e instanceof Error ? e.message : "取り下げに失敗しました")
      }
    })
  }

  return (
    <div className="text-right">
      <button
        type="button"
        onClick={handle}
        disabled={pending}
        className="rounded-md border border-red-300 bg-white px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {pending ? "処理中..." : "応募を取り下げる"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

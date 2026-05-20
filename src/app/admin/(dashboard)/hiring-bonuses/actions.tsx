"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

export function BonusActions({
  bonusId,
  status,
}: {
  bonusId: string
  status: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState("")

  async function run(action: "approve" | "mark_paid" | "reject") {
    setError("")
    const reason =
      action === "reject" ? window.prompt("却下理由 (任意)") : null
    try {
      const res = await fetch(`/api/admin/hiring-bonuses/${bonusId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason: reason ?? undefined }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d?.error ?? "更新失敗")
        return
      }
      startTransition(() => router.refresh())
    } catch {
      setError("通信エラー")
    }
  }

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex gap-2 flex-wrap justify-end">
        {status === "requested" && (
          <>
            <button
              type="button"
              onClick={() => run("approve")}
              disabled={pending}
              className="border border-blue-600 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-50"
            >
              承認
            </button>
            <button
              type="button"
              onClick={() => run("reject")}
              disabled={pending}
              className="border border-gray-400 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
            >
              却下
            </button>
          </>
        )}
        {status === "approved" && (
          <button
            type="button"
            onClick={() => run("mark_paid")}
            disabled={pending}
            className="bg-green-600 px-3 py-1 text-xs font-bold text-white hover:bg-green-700 disabled:opacity-50"
          >
            支払済にする
          </button>
        )}
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

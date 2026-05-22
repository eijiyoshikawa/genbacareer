"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, X } from "lucide-react"

const WITHDRAW_WINDOW_MS = 24 * 60 * 60 * 1000

/**
 * 応募取り消しボタン。
 * - 応募から 24h 以内
 * - status が applied / reviewing のみ
 * を満たすときに表示。それ以外では `null` を返す。
 */
export function WithdrawButton({
  applicationId,
  status,
  createdAt,
}: {
  applicationId: string
  status: string
  createdAt: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  const eligible =
    (status === "applied" || status === "reviewing") &&
    Date.now() - new Date(createdAt).getTime() <= WITHDRAW_WINDOW_MS

  if (!eligible) return null

  async function withdraw(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm("この応募を取り消しますか？取り消し後は元に戻せません。"))
      return
    setBusy(true)
    try {
      const res = await fetch(
        `/api/users/me/applications/${applicationId}/withdraw`,
        { method: "POST" }
      )
      if (res.ok) {
        startTransition(() => router.refresh())
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || "取り消しに失敗しました")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={withdraw}
      disabled={busy}
      className="press inline-flex items-center gap-1 border border-red-300 px-2 py-1 text-xs font-bold text-red-700 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <X className="h-3 w-3" />
      )}
      応募を取り消す
    </button>
  )
}

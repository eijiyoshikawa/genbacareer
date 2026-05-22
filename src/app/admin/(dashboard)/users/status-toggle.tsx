"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, ShieldAlert, ShieldCheck } from "lucide-react"

export function UserStatusToggle({
  userId,
  currentStatus,
}: {
  userId: string
  currentStatus: "active" | "suspended"
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [, startTransition] = useTransition()

  async function toggle() {
    const nextStatus = currentStatus === "active" ? "suspended" : "active"
    let reason: string | null = null
    if (nextStatus === "suspended") {
      reason = window.prompt(
        "凍結理由を入力してください（例: スパム応募、利用規約違反）"
      )
      if (reason === null) return
    } else {
      if (!confirm("凍結を解除しますか？")) return
    }
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: nextStatus,
          reason: reason ?? undefined,
        }),
      })
      if (res.ok) {
        startTransition(() => router.refresh())
      } else {
        alert("操作に失敗しました")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={busy}
      className={`press inline-flex items-center gap-1 px-2 py-1 text-xs font-bold disabled:opacity-50 ${
        currentStatus === "active"
          ? "border border-red-300 text-red-700 hover:bg-red-50"
          : "border border-emerald-300 text-emerald-700 hover:bg-emerald-50"
      }`}
    >
      {busy ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : currentStatus === "active" ? (
        <ShieldAlert className="h-3 w-3" />
      ) : (
        <ShieldCheck className="h-3 w-3" />
      )}
      {currentStatus === "active" ? "凍結する" : "解除"}
    </button>
  )
}

"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AdminRowActions({
  id,
  isActive,
}: {
  id: string
  isActive: boolean
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    try {
      await fetch(`/api/admin/admins/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm("この管理者を削除します。元に戻せません。よろしいですか？")) return
    setBusy(true)
    try {
      await fetch(`/api/admin/admins/${id}`, { method: "DELETE" })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function resetPassword() {
    if (
      !confirm(
        "新しい PW を発行します。発行された PW は一度だけ表示されます。よろしいですか？"
      )
    )
      return
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/admins/${id}/reset-password`, {
        method: "POST",
      })
      const data = await res.json()
      if (res.ok && data.password) {
        prompt("新しい PW（コピーしてください）:", data.password)
        router.refresh()
      } else {
        alert(data.error ?? "再発行に失敗しました")
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex justify-end gap-2 text-xs">
      <button
        type="button"
        disabled={busy}
        onClick={resetPassword}
        className="text-blue-600 hover:underline disabled:opacity-50"
      >
        PW 再発行
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={toggle}
        className="text-gray-600 hover:underline disabled:opacity-50"
      >
        {isActive ? "無効化" : "有効化"}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={remove}
        className="text-red-600 hover:underline disabled:opacity-50"
      >
        削除
      </button>
    </div>
  )
}

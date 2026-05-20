"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"

export function DeleteAccountSection() {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canDelete = confirmText === "退会する" && !isDeleting

  async function handleDelete() {
    if (!canDelete) return
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch("/api/users/me", { method: "DELETE" })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as
          | { error?: string }
          | null
        throw new Error(data?.error ?? "退会処理に失敗しました")
      }
      await signOut({ callbackUrl: "/" })
    } catch (err) {
      setError(err instanceof Error ? err.message : "退会処理に失敗しました")
      setIsDeleting(false)
    }
  }

  return (
    <div className="mt-4">
      <label className="block text-sm font-medium text-red-900">
        退会するには「退会する」と入力してください
      </label>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        className="mt-1 block w-full max-w-xs rounded-md border border-red-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500"
        placeholder="退会する"
      />
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      <button
        type="button"
        onClick={handleDelete}
        disabled={!canDelete}
        className="mt-4 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-red-300"
      >
        {isDeleting ? "処理中..." : "退会する"}
      </button>
    </div>
  )
}

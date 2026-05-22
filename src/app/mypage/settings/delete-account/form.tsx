"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Loader2 } from "lucide-react"

export function DeleteAccountForm() {
  const [confirmText, setConfirmText] = useState("")
  const [reason, setReason] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      const res = await fetch("/api/users/me/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText, reason }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data.error || "退会処理に失敗しました")
        setBusy(false)
        return
      }
      // 成功 → セッションを破棄して退会完了画面へ
      await signOut({ redirect: false })
      window.location.href = "/?account=deleted"
    } catch {
      setError("通信に失敗しました")
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-4">
      <div>
        <label className="block text-xs font-bold text-gray-700">
          退会理由（任意・サービス改善に使わせていただきます）
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="例: 転職先が決まったため / 求人が少なかった"
          className="mt-1 block w-full border px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-gray-700">
          確認のため <span className="text-red-600 font-mono">退会する</span> と入力してください
          <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          required
          autoComplete="off"
          className="mt-1 block w-full border px-3 py-2 font-mono text-sm focus:border-red-500 focus:outline-none"
        />
      </div>

      {error && (
        <p className="border border-red-200 bg-red-50 p-3 text-xs text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || confirmText !== "退会する"}
        className="press w-full bg-red-600 px-4 py-3 text-sm font-bold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? (
          <span className="inline-flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            退会処理中...
          </span>
        ) : (
          "アカウントを完全に削除する"
        )}
      </button>
    </form>
  )
}

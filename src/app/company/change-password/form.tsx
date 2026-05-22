"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter()
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (next.length < 8) {
      setError("新しいパスワードは 8 文字以上で入力してください")
      return
    }
    if (next !== confirm) {
      setError("新しいパスワードが一致しません")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/company/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました")
        return
      }
      router.push("/company/dashboard")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {forced ? "仮パスワード" : "現在のパスワード"}
        </label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          required
          className="mt-1 block w-full border px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          新しいパスワード
        </label>
        <input
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          className="mt-1 block w-full border px-3 py-2 text-sm"
          placeholder="8 文字以上"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700">
          新しいパスワード (確認)
        </label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          className="mt-1 block w-full border px-3 py-2 text-sm"
        />
      </div>
      {error && (
        <p className="border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300"
      >
        {loading ? "更新中..." : "パスワードを変更"}
      </button>
    </form>
  )
}

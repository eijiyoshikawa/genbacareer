"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function InviteAcceptForm({
  token,
  email,
}: {
  token: string
  email: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (password.length < 8) {
      setError("パスワードは 8 文字以上で入力してください")
      return
    }
    if (password !== confirm) {
      setError("パスワードが一致しません")
      return
    }
    setLoading(true)
    try {
      const res = await fetch("/api/company/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, name: name || undefined }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "登録に失敗しました")
        return
      }
      router.push(
        `/login?activated=1&callbackUrl=${encodeURIComponent("/company/dashboard")}`
      )
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
          メールアドレス
        </label>
        <input
          type="email"
          value={email}
          disabled
          className="mt-1 block w-full border bg-gray-50 px-3 py-2 text-sm text-gray-600"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          お名前 <span className="text-gray-400">(任意)</span>
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="mt-1 block w-full border px-3 py-2 text-sm"
          placeholder="山田 太郎"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          パスワード
        </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          maxLength={128}
          className="mt-1 block w-full border px-3 py-2 text-sm"
          placeholder="8 文字以上"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          パスワード (確認)
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
        {loading ? "登録中..." : "アカウントを有効化"}
      </button>
    </form>
  )
}

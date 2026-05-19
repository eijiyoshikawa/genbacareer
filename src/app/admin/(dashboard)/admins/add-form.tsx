"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export function AdminAddForm() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [loading, setLoading] = useState(false)
  const [createdPassword, setCreatedPassword] = useState<string | null>(null)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "追加に失敗しました")
        return
      }
      setCreatedPassword(data.password)
      setEmail("")
      setName("")
      router.refresh()
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  if (createdPassword) {
    return (
      <div className="border-l-4 border-yellow-400 bg-yellow-50 p-4">
        <p className="text-sm font-semibold text-yellow-900">
          管理者を追加しました。下記の PW を新管理者に伝えてください。
        </p>
        <p className="mt-2 text-xs text-yellow-800">
          この PW は <strong>この画面でしか表示されません</strong>。失念した場合は再発行が必要になります。
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 break-all bg-white px-3 py-2 font-mono text-sm">
            {createdPassword}
          </code>
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(createdPassword)}
            className="bg-yellow-600 px-3 py-2 text-xs font-medium text-white hover:bg-yellow-700"
          >
            コピー
          </button>
        </div>
        <button
          type="button"
          onClick={() => setCreatedPassword(null)}
          className="mt-3 text-xs text-yellow-700 underline"
        >
          PW を非表示にして閉じる
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {error && (
        <div className="bg-red-50 p-2 text-xs text-red-700">{error}</div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin2@example.com"
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700">名前（任意）</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="山田 太郎"
            className="mt-1 block w-full border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
      >
        {loading ? "追加中..." : "管理者を追加して PW を発行"}
      </button>
    </form>
  )
}

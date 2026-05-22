"use client"

import { useState } from "react"
import Link from "next/link"

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        if (res.status === 429) {
          setError(
            data.error ??
              "リクエストが多すぎます。しばらく時間を置いてから再度お試しください。"
          )
        } else {
          setError(data.error ?? "送信に失敗しました")
        }
        return
      }
      setSubmitted(true)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">
          確認メールを再送しました
        </h1>
        <p className="mt-4 text-sm text-gray-700">
          ご登録のメールアドレスが見つかり未確認の場合、確認メールを再送しました。
        </p>
        <p className="mt-2 text-xs text-gray-500">
          メールが届かない場合は迷惑メールフォルダもご確認ください。
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          ログインへ
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 text-center">
        確認メールを再送する
      </h1>
      <p className="mt-3 text-center text-sm text-gray-600">
        確認リンクの有効期限が切れた場合や、メールが見つからない場合に再送できます。
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-6 border bg-white p-6 shadow-sm space-y-4"
      >
        {error && (
          <div className="bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700">
            メールアドレス
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 block w-full border px-3 py-2 text-sm shadow-sm"
            placeholder="example@mail.com"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {loading ? "送信中..." : "確認メールを再送する"}
        </button>
      </form>
    </div>
  )
}

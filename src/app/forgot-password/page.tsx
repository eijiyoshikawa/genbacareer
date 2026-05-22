"use client"

import { useState } from "react"
import Link from "next/link"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "エラーが発生しました")
        return
      }

      setSent(true)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 text-center">
        パスワードリセット
      </h1>

      {sent ? (
        <div className="mt-6  border bg-white p-6 shadow-sm text-center">
          <p className="text-green-600 font-medium">メールを送信しました</p>
          <p className="mt-2 text-sm text-gray-500">
            メールアドレスが登録されている場合、リセット用のリンクを送信しました。
            メールをご確認ください。
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            ログインページへ戻る
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6  border bg-white p-6 shadow-sm space-y-4">
          <p className="text-sm text-gray-500">
            登録済みのメールアドレスを入力してください。パスワードリセット用のリンクをお送りします。
          </p>

          {error && (
            <div className=" bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
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
              className="mt-1 block w-full  border px-3 py-2 text-sm shadow-sm"
              placeholder="your@email.com"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full  bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {loading ? "送信中..." : "リセットリンクを送信"}
          </button>

          <p className="text-center text-sm text-gray-500">
            <Link href="/login" className="text-primary-600 hover:text-primary-700">
              ログインページへ戻る
            </Link>
          </p>
        </form>
      )}
    </div>
  )
}

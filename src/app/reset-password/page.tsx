"use client"

import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    if (password !== confirmPassword) {
      setError("パスワードが一致しません")
      return
    }

    if (password.length < 8) {
      setError("パスワードは8文字以上で入力してください")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "エラーが発生しました")
        return
      }

      setSuccess(true)
    } catch {
      setError("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="mt-6  border bg-white p-6 shadow-sm text-center">
        <p className="text-red-600">無効なリセットリンクです。</p>
        <Link
          href="/forgot-password"
          className="mt-4 inline-block text-sm font-medium text-primary-600"
        >
          パスワードリセットを再リクエスト
        </Link>
      </div>
    )
  }

  if (success) {
    return (
      <div className="mt-6  border bg-white p-6 shadow-sm text-center">
        <p className="text-green-600 font-medium">
          パスワードが正常にリセットされました
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block  bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
        >
          ログインする
        </Link>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6  border bg-white p-6 shadow-sm space-y-4">
      {error && (
        <div className=" bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          新しいパスワード
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full  border px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          パスワード確認
        </label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="mt-1 block w-full  border px-3 py-2 text-sm shadow-sm"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full  bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
      >
        {loading ? "リセット中..." : "パスワードをリセット"}
      </button>
    </form>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 text-center">
        新しいパスワードを設定
      </h1>
      <Suspense fallback={<div className="mt-6 text-center text-gray-500">読み込み中...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}

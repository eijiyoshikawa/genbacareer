"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"

type State =
  | { status: "loading" }
  | { status: "success"; alreadyVerified: boolean }
  | { status: "error"; message: string }

function VerifyEmailContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [state, setState] = useState<State>({ status: "loading" })

  useEffect(() => {
    if (!token) return

    let cancelled = false

    void (async () => {
      try {
        const res = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        })
        const data = await res.json()
        if (cancelled) return

        if (!res.ok) {
          setState({
            status: "error",
            message: data.error ?? "確認に失敗しました",
          })
          return
        }
        setState({
          status: "success",
          alreadyVerified: Boolean(data.alreadyVerified),
        })
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "通信エラーが発生しました",
          })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  if (!token) {
    return (
      <div className="mt-6 bg-white dark:bg-gray-900 p-8 shadow-xl text-center">
        <p className="text-red-600 dark:text-red-400">
          確認リンクが見つかりません。
        </p>
        <Link
          href="/register"
          className="mt-4 inline-block text-sm font-medium text-primary-600 dark:text-primary-400"
        >
          再度ご登録
        </Link>
      </div>
    )
  }

  if (state.status === "loading") {
    return (
      <div className="mt-6 bg-white dark:bg-gray-900 p-8 shadow-xl text-center text-gray-600 dark:text-gray-300">
        確認中...
      </div>
    )
  }

  if (state.status === "error") {
    return (
      <div className="mt-6 bg-white dark:bg-gray-900 p-8 shadow-xl text-center">
        <p className="text-red-600 dark:text-red-400">{state.message}</p>
        <Link
          href="/register"
          className="mt-4 inline-block text-sm font-medium text-primary-600 dark:text-primary-400"
        >
          再度ご登録
        </Link>
      </div>
    )
  }

  if (state.alreadyVerified) {
    return (
      <div className="mt-6 bg-white dark:bg-gray-900 p-8 shadow-xl text-center">
        <p className="text-gray-700 dark:text-gray-200">
          このメールアドレスは既に確認済みです。
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block bg-primary-500 px-6 py-2 text-sm font-medium text-white hover:bg-primary-600 transition"
        >
          ログインする
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-6 bg-white dark:bg-gray-900 p-10 shadow-2xl text-center">
      <p className="text-3xl sm:text-4xl font-black text-primary-600 dark:text-primary-400 leading-tight">
        ようこそ、
        <br className="sm:hidden" />
        ゲンバキャリアへ!
      </p>
      <p className="mt-4 text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        メールアドレスの確認が完了しました。
        <br />
        現場で輝くキャリアを、ここから一緒に始めましょう。
      </p>
      <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/login"
          className="w-full sm:w-auto bg-primary-500 px-8 py-3 text-base font-bold text-white hover:bg-primary-600 shadow-md transition"
        >
          ログインして始める
        </Link>
        <Link
          href="/jobs"
          className="w-full sm:w-auto px-8 py-3 text-base font-medium text-gray-700 dark:text-gray-200 hover:text-primary-600 dark:hover:text-primary-400"
        >
          まず求人を見てみる
        </Link>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 text-center">
        メールアドレスの確認
      </h1>
      <Suspense
        fallback={
          <div className="mt-6 text-center text-gray-500 dark:text-gray-400">
            読み込み中...
          </div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
    </div>
  )
}

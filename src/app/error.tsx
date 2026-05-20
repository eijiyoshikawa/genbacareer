"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  RefreshCw,
  Home,
  Search,
  Mail,
  Copy,
  Check,
} from "lucide-react"
import * as Sentry from "@sentry/nextjs"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    console.error(error)
    Sentry.captureException(error, {
      tags: { boundary: "app-error" },
      extra: { digest: error.digest },
    })
  }, [error])

  const copyDigest = async () => {
    if (!error.digest) return
    try {
      await navigator.clipboard.writeText(error.digest)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard 不可環境では何もしない
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-16 bg-gradient-to-b from-white to-gray-50">
      <div className="w-full max-w-md text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center bg-primary-50 border-2 border-primary-100">
          <AlertTriangle className="h-7 w-7 text-primary-600" />
        </div>
        <p className="mt-4 text-xs font-bold tracking-wide text-primary-600">
          ERROR
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          ページを表示できません
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          一時的な問題が発生しています。<br className="sm:hidden" />
          時間をおいて再度お試しください。
        </p>

        {/* Primary CTA: retry */}
        <div className="mt-6">
          <button
            onClick={reset}
            className="press inline-flex items-center gap-1.5 bg-primary-600 px-6 py-3 text-sm font-bold text-white hover:bg-primary-700 transition shadow-sm w-full sm:w-auto justify-center"
          >
            <RefreshCw className="h-4 w-4" />
            もう一度試す
          </button>
        </div>

        {/* Secondary nav: 主要ページへの動線 */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Link
            href="/"
            className="press inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            <Home className="h-3.5 w-3.5" />
            トップへ
          </Link>
          <Link
            href="/jobs"
            className="press inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            <Search className="h-3.5 w-3.5" />
            求人を探す
          </Link>
          <Link
            href="/contact"
            className="press inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition"
          >
            <Mail className="h-3.5 w-3.5" />
            お問い合わせ
          </Link>
        </div>

        {/* Error digest: コピー可能 (サポート連絡用) */}
        {error.digest && (
          <div className="mt-6 inline-flex items-center gap-2 border border-gray-200 bg-gray-50 px-3 py-1.5">
            <span className="text-xs font-mono text-gray-500">
              ref: {error.digest}
            </span>
            <button
              type="button"
              onClick={copyDigest}
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary-600 transition"
              title="コードをコピー"
              aria-label="エラーコードをクリップボードにコピー"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3" />
                  コピー済
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  コピー
                </>
              )}
            </button>
          </div>
        )}
        {error.digest && (
          <p className="mt-2 text-[11px] text-gray-400">
            復旧しない場合はお問い合わせ時にこのコードを添えてください。
          </p>
        )}
      </div>
    </div>
  )
}

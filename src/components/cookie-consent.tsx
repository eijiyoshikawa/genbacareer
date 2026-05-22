"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { Cookie, X } from "lucide-react"

/**
 * Cookie 同意バナー（GDPR / 改正電気通信事業法 対応）。
 *
 * - localStorage `cookie_consent` = "all" | "essential" | <未設定>
 * - 同意取得まで GA4 / Sentry を初期化させない（GoogleAnalytics / Sentry 側で参照）
 * - `gc_sid` は必須 Cookie（不正検知・セッション維持）として常時発行
 *
 * 表示位置: 画面下部固定、初回訪問のみ。
 */

const STORAGE_KEY = "cookie_consent"

type ConsentValue = "all" | "essential"

export function getStoredConsent(): ConsentValue | null {
  if (typeof window === "undefined") return null
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === "all" || v === "essential" ? v : null
  } catch {
    return null
  }
}

export function CookieConsentBanner() {
  // localStorage を外部ストアとして読む（SSR は null、ハイドレーション後に実値）
  const consent = useSyncExternalStore<ConsentValue | null>(
    (cb) => {
      window.addEventListener("storage", cb)
      window.addEventListener("cookie-consent-changed", cb)
      return () => {
        window.removeEventListener("storage", cb)
        window.removeEventListener("cookie-consent-changed", cb)
      }
    },
    () => getStoredConsent(),
    () => null
  )
  // 「閉じる」を押した直後だけ非表示にするための一時的なローカル状態。
  const [dismissed, setDismissed] = useState(false)
  const show = !dismissed && consent === null

  function save(value: ConsentValue) {
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      // ignore
    }
    // 受諾後すぐ GA を再初期化できるよう CustomEvent を発火
    window.dispatchEvent(
      new CustomEvent("cookie-consent-changed", { detail: value })
    )
    setDismissed(true)
  }

  if (!show) return null

  return (
    <div
      role="dialog"
      aria-labelledby="cookie-consent-title"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-gray-200 bg-white shadow-2xl"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:gap-4 sm:px-6">
        <Cookie className="hidden h-6 w-6 shrink-0 text-primary-600 sm:block" />
        <div className="min-w-0 flex-1">
          <p
            id="cookie-consent-title"
            className="text-sm font-bold text-gray-900"
          >
            Cookie の利用について
          </p>
          <p className="mt-1 text-xs leading-relaxed text-gray-600">
            ゲンバキャリアは、サービスの提供・改善のために Cookie を使用します。
            「すべて受け入れる」を選ぶと、アクセス解析（Google
            Analytics）やエラー監視（Sentry）にも Cookie が利用されます。
            <Link
              href="/privacy"
              className="ml-1 underline hover:text-primary-700"
            >
              プライバシーポリシー
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => save("essential")}
            className="press border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
          >
            必須のみ
          </button>
          <button
            type="button"
            onClick={() => save("all")}
            className="press bg-primary-600 px-4 py-2 text-xs font-bold text-white hover:bg-primary-700"
          >
            すべて受け入れる
          </button>
        </div>
        <button
          type="button"
          aria-label="バナーを閉じる（必須のみ）"
          onClick={() => save("essential")}
          className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-700 sm:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}

"use client"

/**
 * 14.4 Google Calendar 連携 UI。
 *
 * - 未連携: 「Google カレンダーと連携」ボタン
 * - 連携済み: 連携 Google アカウントを表示 + 解除ボタン
 *
 * URL ?calendar_ok=... / ?calendar_error=... を読んでフラッシュ表示。
 */

import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { CalendarCheck, AlertTriangle, Loader2 } from "lucide-react"

type Props = {
  connected: boolean
  email?: string
}

const STATUS_OK_LABEL: Record<string, string> = {
  connected: "Google カレンダーと連携しました",
  reauthorized: "Google カレンダーの認可を更新しました",
}
const STATUS_ERROR_LABEL: Record<string, string> = {
  missing_params: "認可コードを受け取れませんでした",
  invalid_state: "セッションが期限切れ、または不正な state です",
  no_refresh_token:
    "リフレッシュトークンを取得できませんでした。Google アカウント側で連携を一度解除してから再試行してください",
  exchange_failed: "Google からのトークン取得に失敗しました",
  access_denied: "ユーザーが認可をキャンセルしました",
}

export function CalendarConnectPanel({ connected, email }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const okMsg = params.get("calendar_ok")
  const errorMsg = params.get("calendar_error")
  const [disconnecting, setDisconnecting] = useState(false)

  async function disconnect() {
    if (!confirm("Google カレンダー連携を解除しますか？")) return
    setDisconnecting(true)
    try {
      const res = await fetch("/api/company/calendar/disconnect", {
        method: "POST",
      })
      if (res.ok) {
        router.refresh()
      }
    } finally {
      setDisconnecting(false)
    }
  }

  return (
    <section className="border bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-gray-900">
        <CalendarCheck className="h-5 w-5 text-primary-600" />
        Google カレンダー連携 (14.4)
      </h2>
      <p className="mt-2 text-xs text-gray-500 leading-relaxed">
        連携すると、応募者の「面接日時」を保存・更新したタイミングで自動的に
        Google カレンダーにイベントを作成します。求職者にも招待メールが送信されます。
      </p>

      {okMsg && STATUS_OK_LABEL[okMsg] && (
        <div className="mt-3 border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {STATUS_OK_LABEL[okMsg]}
        </div>
      )}
      {errorMsg && (
        <div className="mt-3 flex items-start gap-2 border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>
            {STATUS_ERROR_LABEL[errorMsg] ?? `エラー: ${errorMsg}`}
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {connected ? (
          <>
            <div className="inline-flex items-center gap-2 border border-green-300 bg-green-50 px-3 py-1.5 text-sm">
              <CalendarCheck className="h-4 w-4 text-green-700" />
              <span className="font-bold text-green-800">連携中:</span>
              <span className="text-green-900">{email ?? "(不明)"}</span>
            </div>
            <button
              type="button"
              onClick={disconnect}
              disabled={disconnecting}
              className="inline-flex items-center gap-1.5 border border-gray-300 bg-white px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              {disconnecting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              連携を解除
            </button>
            {/* API route への full browser navigation 必須 (OAuth リダイレクト) */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/api/company/calendar/connect"
              className="text-xs text-primary-700 hover:underline"
            >
              別のアカウントで再連携
            </a>
          </>
        ) : (
          // API route への full browser navigation 必須 (OAuth リダイレクト)
          // eslint-disable-next-line @next/next/no-html-link-for-pages
          <a
            href="/api/company/calendar/connect"
            className="inline-flex items-center gap-2 bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
          >
            <CalendarCheck className="h-4 w-4" />
            Google カレンダーと連携
          </a>
        )}
      </div>
    </section>
  )
}

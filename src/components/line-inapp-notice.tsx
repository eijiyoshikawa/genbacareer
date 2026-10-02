"use client"

import { useEffect, useState } from "react"
import { ArrowSquareOut } from "@phosphor-icons/react"

/**
 * LINE アプリ内ブラウザ(WebView)検知 → 外部ブラウザ誘導バナー。
 *
 * LINE 内ブラウザは OAuth(LINE ログイン)往復で認証用 Cookie を保持しきれず、
 * 「何も起きずログイン画面に戻る」現象が起きる。auth 設定は変えず、
 * `openExternalBrowser=1`（LINE 独自パラメータ）で同じURLを外部ブラウザで開き直す。
 *
 * UA に "Line/" を含む場合のみ表示（クライアントでのみ判定 → ハイドレーション不整合回避）。
 */
export function LineInAppNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || ""
    // UA 判定はクライアントでのみ可能なため effect 内で一度だけ setState する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (/Line\//i.test(ua)) setShow(true)
  }, [])

  if (!show) return null

  const openExternal = () => {
    try {
      const u = new URL(window.location.href)
      // LINE 内ブラウザはこのパラメータ付きURLへの遷移を外部ブラウザで開く
      u.searchParams.set("openExternalBrowser", "1")
      window.location.href = u.toString()
    } catch {
      window.location.href =
        window.location.href +
        (window.location.href.includes("?") ? "&" : "?") +
        "openExternalBrowser=1"
    }
  }

  return (
    <div className="mb-4 border border-amber-300 bg-amber-50 p-3 text-amber-900">
      <p className="text-xs leading-relaxed">
        <strong>LINE アプリ内ブラウザではログイン・連携ができません。</strong>
        <br />
        下のボタンから外部ブラウザ（Safari / Chrome）で開き直してください。
      </p>
      <button
        type="button"
        onClick={openExternal}
        className="press mt-2 inline-flex items-center gap-1.5 bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700"
      >
        <ArrowSquareOut className="h-4 w-4" weight="bold" />
        外部ブラウザで開く
      </button>
    </div>
  )
}

"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Info, X } from "lucide-react"

/**
 * リリース前（プレリリース）告知モーダル。
 *
 * - サイト来訪時に1回だけ表示（sessionStorage で同一セッション中は再表示しない）
 * - マガジン(/journal)・管理(/admin)・企業(/company)・LIFF(/liff) では非表示
 * - ブランド配色（オレンジ系）。auth 等には一切触れない純表示コンポーネント
 */
const HIDDEN_PREFIXES = ["/journal", "/admin", "/company", "/liff"]
const STORAGE_KEY = "prerelease_notice_ack_v1"

export function PreReleaseNotice() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))
    let acked = false
    try {
      acked = !!sessionStorage.getItem(STORAGE_KEY)
    } catch {
      /* sessionStorage 不可環境では毎回表示 */
    }
    // クライアントでのみ可視判定するため effect 内で一度 setState する
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(!hidden && !acked)
  }, [pathname])

  if (!open) return null

  const close = () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, "1")
    } catch {
      /* noop */
    }
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="prerelease-title"
      onClick={close}
    >
      <div
        className="w-full max-w-sm border border-primary-200 bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary-100 text-primary-600">
            <Info className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2
              id="prerelease-title"
              className="text-base font-extrabold text-gray-900"
            >
              リリース前のお知らせ
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              本サービスは現在<strong className="text-primary-700">リリース前（プレリリース）</strong>です。
              一部の機能や掲載情報は準備中・テスト段階の場合があります。
              ご利用の際はあらかじめご了承ください。
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="閉じる"
            className="press -mr-1 -mt-1 shrink-0 p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <button
          type="button"
          onClick={close}
          className="press mt-5 w-full bg-primary-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-primary-700"
        >
          確認しました
        </button>
      </div>
    </div>
  )
}

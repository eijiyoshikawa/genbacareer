"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import { Info, X } from "lucide-react"

/**
 * リリース前（プレリリース）告知。
 *
 * 構成:
 *  - 画面上部の「常設バナー」（非表示対象ページ以外で常時表示）
 *  - 来訪のたびに開くモーダル（毎回表示）。ユーザーが「今後表示しない」を選べる（localStorage）
 *  - バナーの「詳細」ボタンでいつでもモーダルを再表示できる（= 表示/非表示をユーザーが選択可）
 *
 * 非表示対象: マガジン(/journal)・管理(/admin)・企業(/company)・LIFF(/liff)
 * auth 等には一切触れない純表示コンポーネント。ブランド配色（オレンジ系）。
 */
const HIDDEN_PREFIXES = ["/journal", "/admin", "/company", "/liff"]
const OPTOUT_KEY = "prerelease_modal_optout_v1"

export function PreReleaseNotice() {
  const pathname = usePathname()
  const hidden = HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))

  const [modalOpen, setModalOpen] = useState(false)
  const [dontShow, setDontShow] = useState(false)

  // 毎回表示: 来訪・遷移のたび、オプトアウトしていなければモーダルを開く
  useEffect(() => {
    if (hidden) return
    let optout = false
    try {
      optout = !!localStorage.getItem(OPTOUT_KEY)
    } catch {
      /* localStorage 不可環境では毎回表示 */
    }
    // クライアントでのみ判定するため effect 内で setState する
    /* eslint-disable react-hooks/set-state-in-effect */
    setDontShow(optout)
    setModalOpen(!optout)
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [pathname, hidden])

  if (hidden) return null

  const persistOptout = (v: boolean) => {
    try {
      if (v) localStorage.setItem(OPTOUT_KEY, "1")
      else localStorage.removeItem(OPTOUT_KEY)
    } catch {
      /* noop */
    }
    setDontShow(v)
  }

  return (
    <>
      {/* 常設バナー（上部） */}
      <div className="bg-primary-600 text-white">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-1.5 text-xs sm:px-6 sm:text-sm lg:px-8">
          <Info className="h-4 w-4 shrink-0" />
          <span className="flex-1 font-bold leading-tight">
            本サービスはリリース前（プレリリース）です。
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="shrink-0 whitespace-nowrap font-bold underline underline-offset-2 hover:opacity-80"
          >
            詳細
          </button>
        </div>
      </div>

      {/* モーダル（毎回表示・ユーザーが表示可否を選択可） */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prerelease-title"
          onClick={() => setModalOpen(false)}
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
                  本サービスは現在
                  <strong className="text-primary-700">
                    リリース前（プレリリース）
                  </strong>
                  です。一部の機能や掲載情報は準備中・テスト段階の場合があります。
                  ご利用の際はあらかじめご了承ください。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="閉じる"
                className="press -mr-1 -mt-1 shrink-0 p-1 text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <label className="mt-4 flex cursor-pointer items-center gap-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={dontShow}
                onChange={(e) => persistOptout(e.target.checked)}
                className="h-4 w-4 accent-primary-600"
              />
              今後このポップアップを表示しない（上部バナーは残ります）
            </label>

            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="press mt-4 w-full bg-primary-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-primary-700"
            >
              確認しました
            </button>
          </div>
        </div>
      )}
    </>
  )
}

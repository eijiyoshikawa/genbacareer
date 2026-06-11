"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { LinkButton } from "@/components/ui/button"
import { BrandLogo } from "./brand-logo"
import { HeaderLogoutButton } from "./header-logout-button"

/**
 * モバイル用フルスクリーンメニュー。
 *
 * Header 本体を Server Component に保ち、開閉状態だけをこの薄い
 * Client コンポーネントに閉じ込めることで、全画面に乗る Hydration
 * コストを最小化する。
 *
 * 開いたときに body のスクロールをロックして、メニュー内スクロールが
 * 背景ページにフォールスルーするのを防ぐ。
 *
 * @param myPage - ログイン中ユーザー用「マイページ」相当のリンク。
 *                 未ログイン時は null。
 */
export function HeaderMobileMenu({
  myPage,
  isCompany = false,
}: {
  myPage: { href: string; label: string } | null
  /** 企業アカウント時は求職者向けナビを隠す */
  isCompany?: boolean
}) {
  const [open, setOpen] = useState(false)
  const close = () => setOpen(false)

  // 開閉に応じて body スクロールをロック
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex md:hidden h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-100"
        aria-label="メニューを開く"
        aria-expanded={open}
        aria-controls="header-mobile-drawer"
      >
        {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {open && (
        <div
          id="header-mobile-drawer"
          className="md:hidden fixed inset-0 z-[60] bg-white overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          {/* ヘッダー行 (閉じるボタン) */}
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white px-4 py-3 shadow-sm">
            <Link
              href={isCompany ? "/company/dashboard" : "/"}
              onClick={close}
              aria-label="ゲンバキャリア トップへ"
            >
              <BrandLogo />
            </Link>
            <button
              type="button"
              onClick={close}
              className="flex h-11 w-11 items-center justify-center text-gray-700 hover:bg-gray-100"
              aria-label="メニューを閉じる"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* メニュー本体 — タップターゲット大きめ */}
          <nav className="px-4 py-6 space-y-2">
            {!isCompany && (
              <>
                <MenuItem href="/" label="トップ" onClick={close} />
                <MenuItem href="/jobs" label="求人を探す" onClick={close} />
                <MenuItem href="/jobs/feed" label="新着フィード" onClick={close} />
                <MenuItem href="/jobs/map" label="マップから探す" onClick={close} />
                <MenuItem href="/journal" label="お役立ちマガジン" onClick={close} />
                <MenuItem href="/shindan" label="適職診断（無料）" onClick={close} />
                <MenuItem href="/for-employers" label="企業の方へ" onClick={close} />
              </>
            )}

            <div className={`${isCompany ? "" : "pt-6 mt-4 border-t border-gray-100"} space-y-3`}>
              {myPage ? (
                <>
                  <LinkButton
                    href={myPage.href}
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={close}
                    className="!h-14 !text-base bg-primary-500 hover:bg-primary-600 shadow-sm"
                  >
                    {myPage.label}
                  </LinkButton>
                  <HeaderLogoutButton variant="mobile" />
                </>
              ) : (
                <>
                  <LinkButton
                    href="/register/wizard"
                    variant="primary"
                    size="lg"
                    fullWidth
                    onClick={close}
                    className="!h-14 !text-base bg-primary-500 hover:bg-primary-600 shadow-sm"
                  >
                    無料で会員登録
                  </LinkButton>
                  <LinkButton
                    href="/login"
                    variant="secondary"
                    size="lg"
                    fullWidth
                    onClick={close}
                    className="!h-14 !text-base border-primary-600 text-primary-700 hover:bg-primary-50"
                  >
                    ログイン
                  </LinkButton>
                </>
              )}
            </div>

            <p className="pt-6 text-center text-xs text-gray-400">
              建設業界特化型 求人サイト ゲンバキャリア
            </p>
          </nav>
        </div>
      )}
    </>
  )
}

function MenuItem({
  href,
  label,
  onClick,
}: {
  href: string
  label: string
  onClick: () => void
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="press flex items-center border border-gray-100 bg-white px-4 py-4 text-base font-bold text-gray-800 shadow-sm hover:border-primary-300 hover:bg-primary-50"
    >
      <span className="flex-1">{label}</span>
    </Link>
  )
}

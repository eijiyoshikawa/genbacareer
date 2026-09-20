"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { LinkButton } from "@/components/ui/button"
import { HeaderMobileMenu } from "./header-mobile-menu"
import { HeaderLogoutButton } from "./header-logout-button"

/**
 * ログインユーザーの role から「マイページ」相当の遷移先を決定する。
 *   seeker         → /mypage
 *   company_*      → /company
 *   admin          → /admin
 * 未ログインは null を返す。
 */
function resolveMyPageTarget(
  role: string | undefined
): { href: string; label: string } | null {
  switch (role) {
    case "seeker":
      return { href: "/mypage", label: "マイページ" }
    case "company_admin":
    case "company_member":
      // ダッシュボードは route group (dashboard) 経由で /company/dashboard。
      // /company 直下にはページが無いため、ここを /company にすると 404 になる。
      return { href: "/company/dashboard", label: "企業ダッシュボード" }
    case "admin":
      return { href: "/admin", label: "管理画面" }
    default:
      return null
  }
}

function isCompanyRole(role: string | undefined): boolean {
  return role === "company_admin" || role === "company_member"
}

/**
 * サイト共通ヘッダー（クライアントコンポーネント）。
 *
 * セッションは /api/auth/session をクライアントで取得し、ログイン状態に応じて表示を切替:
 *   - 未ログイン: 「ログイン / 無料で始める」
 *   - ログイン中: 「マイページ（or 企業ダッシュボード/管理画面） / ログアウト」
 *
 * サーバー側で auth()（cookies）を読まないことで、Header を含む全ページを静的化でき、
 * ISR ページがバックグラウンド再生成に失敗（DYNAMIC_SERVER_USAGE）する問題を防ぐ。
 */
export function Header() {
  // 認証状態はクライアントで取得する。これにより Header を含む全ページが
  // サーバー側で cookies を読まずに静的化でき、ISR ページの再生成が
  // DYNAMIC_SERVER_USAGE で 500 になる問題を回避する。
  // 初期状態（未取得）は未ログイン表示＝公開ビュー（SEO 上もこれが正）。
  const [role, setRole] = useState<string | undefined>(undefined)
  useEffect(() => {
    let active = true
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return
        setRole(
          data?.user ? ((data.user as { role?: string }).role ?? "seeker") : undefined,
        )
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [])
  const myPage = resolveMyPageTarget(role)
  // 企業アカウントには求職者向けのブラウズ機能（求人検索/フィード/マップ/マガジン）は
  // 見せず、ダッシュボードのみに集約する。求人プレビューは各求人の
  // /jobs/preview/[token] で確認できる。
  const isCompany = isCompanyRole(role)

  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            href={isCompany ? "/company/dashboard" : "/"}
            aria-label="ゲンバキャリア トップへ"
          >
            {/* 横長ワードマーク(約5:1)。高さ基準で幅 auto、object-contain で切れ防止 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/genbacareer-mark.svg"
              alt="ゲンバキャリア"
              className="h-8 w-auto max-w-[220px] object-contain sm:h-9"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {!isCompany && (
              <>
                <Link
                  href="/jobs"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
                >
                  求人を探す
                </Link>
                <Link
                  href="/jobs/feed"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
                >
                  フィード
                </Link>
                <Link
                  href="/jobs/map"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
                >
                  マップ
                </Link>
                <Link
                  href="/journal"
                  className="px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
                >
                  マガジン
                </Link>
                <Link
                  href="/shindan"
                  className="px-3 py-2 text-sm font-bold text-primary-600 hover:text-primary-700 transition"
                >
                  適職診断
                </Link>
                <Link
                  href="/for-employers"
                  className="px-3 py-2 text-xs text-gray-600 hover:text-primary-600 transition"
                >
                  企業の方
                </Link>
              </>
            )}

            {myPage ? (
              <>
                <LinkButton
                  href={myPage.href}
                  variant="primary"
                  size="md"
                  className="ml-1 bg-primary-500 hover:bg-primary-600 shadow-sm"
                >
                  {myPage.label}
                </LinkButton>
                <HeaderLogoutButton variant="desktop" />
              </>
            ) : (
              <>
                <LinkButton
                  href="/login"
                  variant="secondary"
                  size="md"
                  className="ml-1 border-primary-600 text-primary-600 hover:bg-primary-50"
                >
                  ログイン
                </LinkButton>
                <LinkButton
                  href="/register/wizard"
                  variant="primary"
                  size="md"
                  className="bg-primary-500 hover:bg-primary-600 shadow-sm"
                >
                  無料で始める
                </LinkButton>
              </>
            )}
          </nav>

          <HeaderMobileMenu myPage={myPage} isCompany={isCompany} />
        </div>
      </div>
    </header>
  )
}

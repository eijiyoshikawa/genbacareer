import Link from "next/link"
import { LinkButton } from "@/components/ui/button"
import { HeaderMobileMenu } from "./header-mobile-menu"
import { HeaderLogoutButton } from "./header-logout-button"
import { auth } from "@/lib/auth"

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
 * サイト共通ヘッダー。
 *
 * await auth() でセッションを取得し、ログイン状態に応じて表示を切り替える:
 *   - 未ログイン: 「ログイン / 無料で始める」
 *   - ログイン中: 「マイページ（or 企業ダッシュボード/管理画面） / ログアウト」
 */
export async function Header() {
  const session = await auth()
  const role = session?.user
    ? ((session.user as { role?: string }).role ?? "seeker")
    : undefined
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
            {/* ロゴマークのみ。全体が切れないよう object-contain で表示 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/genbacareer-mark.svg"
              alt="ゲンバキャリア"
              className="h-12 w-auto max-w-[230px] object-contain sm:h-14"
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

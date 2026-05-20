import Link from "next/link"
import { Search, Newspaper, MessageCircle, Sparkles, Map as MapIcon } from "lucide-react"
import { BrandLogo } from "./brand-logo"
import { LinkButton } from "@/components/ui/button"
import { HeaderMobileMenu } from "./header-mobile-menu"

/**
 * サイト共通ヘッダー。
 *
 * 全ページに乗るため Server Component で実装し、Hydration コストを抑える。
 * モバイルメニューの開閉だけ <HeaderMobileMenu> に切り出して Client 化。
 */
export function Header() {
  return (
    <header className="bg-white sticky top-0 z-50 border-b border-gray-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link href="/" aria-label="ゲンバキャリア トップへ">
            <BrandLogo />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/jobs"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
            >
              <Search className="h-4 w-4" />
              求人を探す
            </Link>
            <Link
              href="/jobs/feed"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
            >
              <Sparkles className="h-4 w-4" />
              フィード
            </Link>
            <Link
              href="/jobs/map"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
            >
              <MapIcon className="h-4 w-4" />
              マップ
            </Link>
            <Link
              href="/journal"
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 hover:text-primary-600 transition"
            >
              <Newspaper className="h-4 w-4" />
              マガジン
            </Link>
            <Link
              href="/for-employers"
              className="px-3 py-2 text-xs text-gray-600 hover:text-primary-600 transition"
            >
              企業の方
            </Link>
            <LinkButton
              href="/login"
              variant="secondary"
              size="md"
              className="ml-1 border-primary-600 text-primary-600 hover:bg-primary-50"
            >
              ログイン
            </LinkButton>
            <LinkButton
              href="/register"
              variant="primary"
              size="md"
              className="bg-primary-500 hover:bg-primary-600 shadow-sm"
            >
              <MessageCircle className="h-4 w-4" />
              無料で始める
            </LinkButton>
          </nav>

          <HeaderMobileMenu />
        </div>
      </div>
    </header>
  )
}

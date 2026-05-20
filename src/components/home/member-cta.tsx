import Link from "next/link"
import {
  Sparkle,
  Bell,
  HandCoins,
  ShieldCheck,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr"

/**
 * 会員登録誘導 CTA バナー。
 *
 * ログインしていないユーザーに、登録のメリット (求人保存・お祝い金・通知)
 * を見せて新規登録ボタンに誘導するセクション。
 */
export function MemberCta() {
  return (
    <section className="bg-gradient-to-br from-primary-50 to-brand-yellow-50 border-y border-primary-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-10">
          <div className="flex-1">
            <p className="inline-flex items-center gap-1.5 bg-brand-yellow-500 text-ink-900 px-3 py-1 text-xs font-extrabold">
              <Sparkle weight="duotone" className="h-3.5 w-3.5" />
              無料・1 分で完了
            </p>
            <h2 className="mt-3 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              会員登録で
              <span className="text-primary-600">あなただけの求人体験</span>
            </h2>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              気になる求人の保存、応募状況の管理、採用後のお祝い金申請まで。<br className="hidden sm:block" />
              履歴書なし・LINE で気軽に応募できます。
            </p>

            <ul className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              <li className="flex items-center gap-2.5 card p-3">
                <span className="flex h-9 w-9 items-center justify-center bg-primary-100 shrink-0">
                  <Bell weight="duotone" className="h-5 w-5 text-primary-600" />
                </span>
                <span className="text-xs font-bold text-gray-800 leading-snug">
                  新着求人を
                  <br />
                  通知で受け取る
                </span>
              </li>
              <li className="flex items-center gap-2.5 card p-3">
                <span className="flex h-9 w-9 items-center justify-center bg-amber-100 shrink-0">
                  <HandCoins
                    weight="duotone"
                    className="h-5 w-5 text-amber-700"
                  />
                </span>
                <span className="text-xs font-bold text-gray-800 leading-snug">
                  採用決定で
                  <br />
                  お祝い金がもらえる
                </span>
              </li>
              <li className="flex items-center gap-2.5 card p-3">
                <span className="flex h-9 w-9 items-center justify-center bg-emerald-100 shrink-0">
                  <ShieldCheck
                    weight="duotone"
                    className="h-5 w-5 text-emerald-700"
                  />
                </span>
                <span className="text-xs font-bold text-gray-800 leading-snug">
                  ブロック企業設定で
                  <br />
                  現職バレ防止
                </span>
              </li>
            </ul>
          </div>

          <div className="w-full lg:w-auto flex flex-col gap-3 lg:min-w-[240px]">
            <Link
              href="/register"
              className="press inline-flex items-center justify-center gap-1.5 bg-primary-600 px-6 py-3 text-base font-extrabold text-white shadow hover:bg-primary-700"
            >
              無料で会員登録
              <CaretRight weight="bold" className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="press inline-flex items-center justify-center gap-1.5 border border-primary-600 bg-white px-6 py-3 text-base font-bold text-primary-700 hover:bg-primary-50"
            >
              ログイン
            </Link>
            <Link
              href="/company/login"
              className="text-center text-xs text-gray-600 underline underline-offset-2 hover:text-primary-700"
            >
              企業の方はこちら
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

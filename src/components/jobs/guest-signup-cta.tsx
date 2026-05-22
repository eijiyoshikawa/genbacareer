import Link from "next/link"
import { Sparkles, ArrowRight, Lock } from "lucide-react"

type Props = {
  total: number
  shown: number
  /** 登録後に戻ってくる URL（検索条件保持） */
  callbackUrl?: string
}

/**
 * 未登録ユーザー向けに、検索結果の末尾に表示するサインアップ誘導 CTA。
 * 「全 N 件中 X 件をお試し表示中。残り（N-X）件は無料会員登録で閲覧できます」
 */
export function GuestSignupCta({ total, shown, callbackUrl }: Props) {
  const remaining = Math.max(0, total - shown)
  const registerHref = callbackUrl
    ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register"
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login"

  return (
    <div className="relative overflow-hidden border border-primary-200 bg-gradient-to-br from-primary-50 to-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary-500 text-white">
          <Lock className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-primary-600">
            お試し閲覧の上限です
          </p>
          <h3 className="mt-1 text-base font-bold text-gray-900 sm:text-lg">
            残り <span className="text-primary-600">{remaining.toLocaleString()}</span> 件は
            無料会員登録で閲覧できます
          </h3>
          <p className="mt-1 text-xs text-gray-600 sm:text-sm">
            未登録のお客様には上位 {shown} 件のみ表示しています。
            会員登録（無料・LINE 連携あり）でこの検索条件のすべての求人を閲覧でき、お気に入り保存・応募・条件保存もご利用いただけます。
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Link
              href={registerHref}
              className="inline-flex items-center gap-1 bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700 transition"
            >
              <Sparkles className="h-4 w-4" />
              無料で会員登録（30 秒）
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href={loginHref}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
            >
              既にアカウントをお持ちの方
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * リスト先頭に表示する小さなインフォバー。
 * 「お試し閲覧中：上位 15 件を表示しています」
 */
export function GuestTrialBanner({ limit, total }: { limit: number; total: number }) {
  return (
    <div className="flex items-center gap-2 border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 sm:text-sm">
      <Sparkles className="h-4 w-4 shrink-0 text-amber-600" />
      <span>
        <strong className="font-bold">お試し閲覧中</strong>
        ：未登録のお客様には条件に合う {total.toLocaleString()} 件のうち上位 {limit} 件のみ表示しています。
      </span>
    </div>
  )
}

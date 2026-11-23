import Link from "next/link"
import {
  Lightning,
  CursorClick,
  EyeSlash,
  Gift,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr"
import { LineLoginButton } from "@/components/auth/line-login-button"

/**
 * 会員登録誘導 CTA バナー。
 *
 * 訴求の主役は「LINE で簡単応募」。次いで「現職バレ防止」、最後に
 * 「採用でお祝い金」。LINE 1 タップ登録を主導線、メール登録 / ログインを
 * 副導線として配置する。
 */
export function MemberCta() {
  return (
    <section className="bg-gradient-to-br from-primary-50 to-brand-yellow-50 border-y border-primary-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5 lg:gap-8">
          {/* === 左: 訴求テキスト + 特徴 === */}
          <div className="flex-1 min-w-0">
            <p className="inline-flex items-center gap-1.5 bg-brand-yellow-500 text-ink-900 px-3 py-1 text-xs font-extrabold">
              <Lightning weight="fill" className="h-3.5 w-3.5" />
              無料・1 分で完了
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              <span className="text-brand-gradient">LINE で簡単応募</span>、
              <br className="hidden sm:block" />
              新しい自分を見つけよう
            </h2>
            <p className="mt-2 text-sm text-gray-700 leading-relaxed max-w-2xl">
              履歴書なし・スマホ1タップで応募完了。やり取りもすべて LINE で
              スムーズ。今の職場に知られず、自分のペースで「稼げる」転職活動を
              始められます。
            </p>

            {/* === 特徴: 主役(LINE応募) + 現職バレ防止 + お祝い金 === */}
            <div className="mt-4 space-y-2.5 max-w-2xl">
              {/* 主役 */}
              <FeatureBadge
                big
                no={1}
                icon={<CursorClick weight="duotone" className="h-7 w-7 text-primary-600" />}
                title="LINE で簡単応募"
                desc="履歴書なし・1 タップで応募完了。面接日程の調整も LINE で完結。"
                accent="from-primary-100 to-primary-50"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* 現職バレ防止（強め） */}
                <FeatureBadge
                  no={2}
                  icon={<EyeSlash weight="duotone" className="h-6 w-6 text-emerald-700" />}
                  title="現職バレ防止"
                  desc="勤務先・知人企業をブロック。今の会社に知られず安心して活動。"
                  accent="from-emerald-100 to-emerald-50"
                />
                {/* 採用でお祝い金（3 番目） */}
                <FeatureBadge
                  no={3}
                  icon={<Gift weight="duotone" className="h-6 w-6 text-amber-700" />}
                  title="採用でお祝い金"
                  desc="採用決定で最大 10 万円相当のお祝い金がもらえます。"
                  accent="from-amber-100 to-amber-50"
                />
              </div>
            </div>
          </div>

          {/* === 右: CTA 群 === */}
          <div className="w-full lg:w-auto flex flex-col gap-2.5 lg:min-w-[280px]">
            {/* LINE 1 タップ登録 (主導線) */}
            <LineLoginButton
              label="LINE で 1 タップ登録"
              callbackUrl="/mypage"
              size="lg"
              fullWidth
            />
            {/* メール登録 */}
            <Link
              href="/register/wizard"
              className="press inline-flex items-center justify-center gap-1.5 bg-primary-600 px-5 py-3 text-sm font-extrabold text-white shadow hover:bg-primary-700"
            >
              メールで無料登録
              <CaretRight weight="bold" className="h-4 w-4" />
            </Link>
            {/* ログイン */}
            <Link
              href="/login"
              className="press inline-flex items-center justify-center gap-1.5 border border-primary-600 bg-white px-5 py-2.5 text-sm font-bold text-primary-700 hover:bg-primary-50"
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

/**
 * 特徴バッジ (番号 + アイコン + タイトル + 説明)。
 * big=true で主役用に一回り大きく表示する。
 */
function FeatureBadge({
  no,
  icon,
  title,
  desc,
  accent,
  big = false,
}: {
  no: number
  icon: React.ReactNode
  title: string
  desc: string
  accent: string
  big?: boolean
}) {
  return (
    <div
      className={`relative flex items-center gap-3 bg-gradient-to-br ${accent} border border-white/60 shadow-sm ${
        big ? "p-4" : "p-3"
      }`}
    >
      {/* 数字バッジ */}
      <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center bg-ink-900 text-white text-[11px] font-extrabold shadow">
        {no}
      </span>
      <span
        className={`flex items-center justify-center bg-white shadow-sm shrink-0 ${
          big ? "h-14 w-14" : "h-11 w-11"
        }`}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={`font-extrabold text-gray-900 leading-tight ${
            big ? "text-base sm:text-lg" : "text-sm"
          }`}
        >
          {title}
        </p>
        <p
          className={`mt-0.5 text-gray-600 leading-snug ${
            big ? "text-xs sm:text-[13px]" : "text-[11px]"
          }`}
        >
          {desc}
        </p>
      </div>
    </div>
  )
}

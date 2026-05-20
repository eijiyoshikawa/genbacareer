import Link from "next/link"
import {
  Sparkle,
  Bell,
  HandCoins,
  ShieldCheck,
  CaretRight,
} from "@phosphor-icons/react/dist/ssr"
import { LineLoginButton } from "@/components/auth/line-login-button"

/**
 * 会員登録誘導 CTA バナー。
 *
 * 未ログインユーザーに登録のメリット (求人保存・お祝い金・ブロック)
 * を見せて新規登録に誘導するセクション。LINE 1 タップ登録を主導線、
 * メール登録 / ログインを副導線として配置。
 */
export function MemberCta() {
  return (
    <section className="bg-gradient-to-br from-primary-50 to-brand-yellow-50 border-y border-primary-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-5 lg:gap-8">
          {/* === 左: 訴求テキスト + 特徴 === */}
          <div className="flex-1 min-w-0">
            <p className="inline-flex items-center gap-1.5 bg-brand-yellow-500 text-ink-900 px-3 py-1 text-xs font-extrabold">
              <Sparkle weight="duotone" className="h-3.5 w-3.5" />
              無料・1 分で完了
            </p>
            <h2 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900 leading-tight">
              会員登録で
              <span className="text-primary-600">あなただけの求人体験</span>
            </h2>

            {/* === 特徴 3 つ (インパクト強化版) === */}
            <ul className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5 max-w-2xl">
              <FeatureBadge
                no={1}
                icon={
                  <Bell weight="duotone" className="h-6 w-6 text-primary-600" />
                }
                title="新着求人を即通知"
                desc="気になる条件で自動配信"
                accent="from-primary-100 to-primary-50"
              />
              <FeatureBadge
                no={2}
                icon={
                  <HandCoins
                    weight="duotone"
                    className="h-6 w-6 text-amber-700"
                  />
                }
                title="採用でお祝い金"
                desc="最大 10 万円相当"
                accent="from-amber-100 to-amber-50"
              />
              <FeatureBadge
                no={3}
                icon={
                  <ShieldCheck
                    weight="duotone"
                    className="h-6 w-6 text-emerald-700"
                  />
                }
                title="現職バレ防止"
                desc="ブロック企業設定"
                accent="from-emerald-100 to-emerald-50"
              />
            </ul>
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
              href="/register"
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
 * 特徴バッジ (番号 + アイコン + タイトル + ひと言)。
 * 数字バッジで「3 つの特典」感を強調、グラデで視認性 UP。
 */
function FeatureBadge({
  no,
  icon,
  title,
  desc,
  accent,
}: {
  no: number
  icon: React.ReactNode
  title: string
  desc: string
  accent: string
}) {
  return (
    <li
      className={`relative flex items-center gap-3 bg-gradient-to-br ${accent} border border-white/60 shadow-sm p-3`}
    >
      {/* 数字バッジ */}
      <span className="absolute -top-2 -left-2 flex h-6 w-6 items-center justify-center bg-ink-900 text-white text-[11px] font-extrabold shadow">
        {no}
      </span>
      <span className="flex h-11 w-11 items-center justify-center bg-white shadow-sm shrink-0">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-extrabold text-gray-900 leading-tight">
          {title}
        </p>
        <p className="mt-0.5 text-[11px] text-gray-600 leading-snug">{desc}</p>
      </div>
    </li>
  )
}

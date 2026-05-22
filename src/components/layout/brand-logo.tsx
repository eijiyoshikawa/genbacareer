/**
 * サイトのブランドロゴ。Header / Footer / メール / OG 画像で再利用する。
 *
 * デザイン: 安全ヘルメット + 「ゲンバキャリア」のワードマーク。
 * 競合（助太刀社員 / 求人ボックス）の HardHat 単体ロゴと差別化するため、
 * 縁取り・グラデーション・斜めライン（建設現場のテープを想起）を加えた独自意匠。
 */
export function BrandLogo({
  variant = "default",
  className = "",
}: {
  /** default: 通常 / dark: 暗背景用（footer / ヒーロー）/ icon: アイコンのみ */
  variant?: "default" | "dark" | "icon"
  className?: string
}) {
  const wordColor =
    variant === "dark" ? "text-white" : "text-gray-900"
  const accent =
    variant === "dark" ? "text-primary-400" : "text-primary-500"

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center">
        {/* ロゴアイコン: ヘルメット + 斜めライン背景 */}
        <svg
          viewBox="0 0 32 32"
          className={`h-8 w-8 ${accent}`}
          fill="currentColor"
          aria-hidden
        >
          {/* 背景の斜線（safety stripe） */}
          <defs>
            <linearGradient id="bc-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="7" fill="url(#bc-grad)" />
          {/* ヘルメット本体 */}
          <path
            d="M16 7c-4.4 0-8 3.4-8 7.6V19h16v-4.4C24 10.4 20.4 7 16 7zm-6 9.6c0-3.3 2.7-6 6-6s6 2.7 6 6V17H10v-0.4z"
            fill="currentColor"
          />
          {/* 顎ライン */}
          <rect x="7" y="20" width="18" height="2.4" rx="1.2" fill="currentColor" />
          {/* リム下のハイライト */}
          <rect x="11" y="11.5" width="10" height="1.5" rx="0.75" fill="currentColor" opacity="0.6" />
        </svg>
      </span>
      {variant !== "icon" && (
        <span className={`text-lg font-extrabold tracking-tight ${wordColor}`}>
          ゲンバ
          <span className={accent}>キャリア</span>
        </span>
      )}
    </span>
  )
}

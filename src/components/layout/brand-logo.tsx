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
      {/* ロゴマーク（public/brand/genbacareer-mark.svg） */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/genbacareer-mark.svg"
        alt="ゲンバキャリア"
        className="h-8 w-8 shrink-0 object-contain"
      />
      {variant !== "icon" && (
        <span className={`text-lg font-extrabold tracking-tight ${wordColor}`}>
          ゲンバ
          <span className={accent}>キャリア</span>
        </span>
      )}
    </span>
  )
}

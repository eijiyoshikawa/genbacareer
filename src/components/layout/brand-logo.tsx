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

  // 横長ワードマーク SVG(明背景向け・濃グレー文字)は Footer 等の暗背景で視認性が
  // 落ちるため、Header 以外（Footer / モバイルメニュー）ではテキストのワードマークを使う。
  // variant により明暗どちらの背景でも読めるよう配色を切り替える。
  return (
    <span className={`inline-flex items-center ${className}`}>
      <span className={`text-lg font-extrabold tracking-tight ${wordColor}`}>
        ゲンバ
        <span className={accent}>キャリア</span>
      </span>
    </span>
  )
}

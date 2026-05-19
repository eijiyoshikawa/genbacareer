import Image from "next/image"

/**
 * サイトのブランドロゴ。Header / Footer / メール / OG 画像で再利用する。
 * /public/logo-demo.jpg をアイコン部分として表示し、ワードマークと並べる。
 */
export function BrandLogo({
  variant = "default",
  className = "",
}: {
  /** default: 通常 / dark: 暗背景用（footer / ヒーロー）/ icon: アイコンのみ */
  variant?: "default" | "dark" | "icon"
  className?: string
}) {
  const wordColor = variant === "dark" ? "text-white" : "text-gray-900"
  const accent = variant === "dark" ? "text-primary-400" : "text-primary-500"

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-md bg-white">
        <Image
          src="/logo-demo.jpg"
          alt="ゲンバキャリアロゴ"
          width={32}
          height={32}
          className="h-8 w-8 object-contain"
          priority
        />
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

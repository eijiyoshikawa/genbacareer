import Link from "next/link"
import { cn } from "@/lib/utils"

/**
 * サイト全体で統一して使うボタン / リンクボタン。
 * - 高さを 36 / 40 / 44px の 3 段階に固定（タップ領域確保）
 * - variant でブランド色 / 中立色 / 危険色 を切り替え
 * - href があれば Next.js <Link>、なければ <button>
 */
type Variant = "primary" | "secondary" | "ghost" | "danger"
type Size = "sm" | "md" | "lg"

const VARIANT: Record<Variant, string> = {
  primary:
    "bg-primary-600 text-white hover:bg-primary-700 disabled:bg-primary-300",
  secondary:
    "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 disabled:opacity-50",
  danger:
    "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300",
}

const SIZE: Record<Size, string> = {
  // 36px — 補助ボタン / フィルタチップ
  sm: "h-9 px-3 text-xs",
  // 40px — 標準（多くの場面）
  md: "h-10 px-4 text-sm",
  // 44px — 主要 CTA / モバイルファースト
  lg: "h-11 px-5 text-sm sm:text-base",
}

const BASE =
  "press inline-flex items-center justify-center gap-1.5 font-bold transition disabled:cursor-not-allowed"

type CommonProps = {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
  className?: string
  children: React.ReactNode
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  type = "button",
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        BASE,
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  )
}

export function LinkButton({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
  href,
  prefetch,
  ...props
}: CommonProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> & {
    href: string
    prefetch?: boolean
  }) {
  return (
    <Link
      href={href}
      prefetch={prefetch}
      className={cn(
        BASE,
        VARIANT[variant],
        SIZE[size],
        fullWidth && "w-full",
        className
      )}
      {...props}
    />
  )
}

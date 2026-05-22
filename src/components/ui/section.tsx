import { cn } from "@/lib/utils"

/**
 * サイト全体で統一して使うセクション。
 * - 内側に max-w-7xl + 画面端パディング
 * - 縦余白を sm 以上で 2 倍に
 * - 背景色は variant でカラーバリエーション
 */
type SectionProps = {
  variant?: "white" | "warm" | "ink" | "transparent"
  size?: "sm" | "md" | "lg"
  bordered?: boolean
  className?: string
  innerClassName?: string
  children: React.ReactNode
  as?: "section" | "div"
}

export function Section({
  variant = "white",
  size = "md",
  bordered = false,
  className,
  innerClassName,
  children,
  as: As = "section",
}: SectionProps) {
  const variantCls =
    variant === "warm"
      ? "bg-warm-100"
      : variant === "ink"
        ? "bg-ink-900 text-white"
        : variant === "transparent"
          ? ""
          : "bg-white"

  const sizeCls =
    size === "sm"
      ? "py-6 sm:py-8"
      : size === "lg"
        ? "py-10 sm:py-16"
        : "py-8 sm:py-12"

  return (
    <As
      className={cn(
        variantCls,
        bordered && "border-y border-gray-200",
        className
      )}
    >
      <div
        className={cn(
          "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
          sizeCls,
          innerClassName
        )}
      >
        {children}
      </div>
    </As>
  )
}

/**
 * セクション見出し（h2）を統一スタイルで。
 * フォントサイズ・余白・アイコン位置を揃える。
 */
export function SectionHeading({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("mb-6 flex items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 sm:text-2xl">
          {icon}
          {title}
        </h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

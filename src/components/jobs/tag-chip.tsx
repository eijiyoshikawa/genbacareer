import { type ReactNode } from "react"

/**
 * 求人ページ全体で使うオレンジ枠のタグチップ。
 * 視覚的統一を目的にこのコンポーネント経由でのみ chip を出す。
 */
export function TagChip({
  children,
  size = "md",
  tone = "primary",
}: {
  children: ReactNode
  size?: "sm" | "md"
  tone?: "primary" | "muted"
}) {
  const sizeCls =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
  const toneCls =
    tone === "primary"
      ? "border-primary-300 text-primary-700 bg-white"
      : "border-gray-200 text-gray-600 bg-gray-50"
  return (
    <span
      className={`inline-flex items-center border ${sizeCls} ${toneCls} font-medium leading-none whitespace-nowrap`}
    >
      {children}
    </span>
  )
}

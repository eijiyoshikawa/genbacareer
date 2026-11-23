import { type ReactNode } from "react"

/**
 * 求人詳細セクションの統一見出し。
 *
 * - `variant="bar"` (デフォルト): 左にオレンジ縦バー + 太字 — 既存互換
 * - `variant="centered"`: マイナビ転職風 中央寄せ太字 + 短い下線
 */
export function SectionHeading({
  children,
  id,
  variant = "bar",
}: {
  children: ReactNode
  id?: string
  variant?: "bar" | "centered"
}) {
  if (variant === "centered") {
    return (
      <div id={id} className="text-center">
        <h2 className="text-base font-bold text-ink-900 sm:text-lg">
          {children}
        </h2>
        <span
          aria-hidden
          className="mx-auto mt-2 block h-0.5 w-10 bg-primary-500"
        />
      </div>
    )
  }
  return (
    <h2
      id={id}
      className="flex items-center gap-2 text-base sm:text-lg font-bold text-gray-900"
    >
      <span className="inline-block h-5 w-1 bg-primary-500" />
      {children}
    </h2>
  )
}

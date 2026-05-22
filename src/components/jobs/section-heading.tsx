import { type ReactNode } from "react"

/**
 * 求人詳細セクションの統一見出し。
 * 左側にオレンジの縦バーを付け、参考デザインの雰囲気に揃える。
 */
export function SectionHeading({
  children,
  id,
}: {
  children: ReactNode
  id?: string
}) {
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

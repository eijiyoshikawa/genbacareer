import { type ReactNode } from "react"

type Tone = "primary" | "muted" | "new" | "urgent" | "featured" | "welcome" | "women" | "experience"

/**
 * 求人ページ全体で使うタグチップ。
 *
 * 大手求人サイト (マイナビ転職等) のように色分けで属性を一目で示す:
 *   new       : 新着         (赤)
 *   urgent    : 急募         (オレンジ)
 *   featured  : 注目         (黄)
 *   welcome   : 未経験歓迎    (緑)
 *   experience: 経験者優遇    (青)
 *   women     : 女性活躍中    (紫)
 *   primary   : 既定 (オレンジ枠)
 *   muted     : 補足 (灰)
 */
export function TagChip({
  children,
  size = "md",
  tone = "primary",
}: {
  children: ReactNode
  size?: "sm" | "md"
  tone?: Tone
}) {
  const sizeCls =
    size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
  const toneCls = TONE_STYLES[tone]
  return (
    <span
      className={`inline-flex items-center border ${sizeCls} ${toneCls} font-medium leading-none whitespace-nowrap`}
    >
      {children}
    </span>
  )
}

const TONE_STYLES: Record<Tone, string> = {
  primary: "border-primary-300 text-primary-700 bg-white",
  muted: "border-gray-200 text-gray-600 bg-gray-50",
  new: "border-red-500 bg-red-500 text-white",
  urgent: "border-primary-500 bg-primary-500 text-white",
  featured: "border-brand-yellow-500 bg-brand-yellow-500 text-ink-900",
  welcome: "border-emerald-200 bg-emerald-50 text-emerald-700",
  experience: "border-blue-200 bg-blue-50 text-blue-700",
  women: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
}

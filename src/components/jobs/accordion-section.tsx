import { type ReactNode } from "react"

/**
 * マイナビ転職風のアコーディオン。
 * 求人詳細の縦長セクションを「+/-」で開閉可能にし、ユーザーが
 * 見たい情報だけ展開できる UX を提供する。
 *
 * SSR フレンドリーに保つため native <details> を採用 (JS 無しで動作)。
 * SEO 的にも中の HTML は描画されているのでクローラから見える。
 */
export function AccordionSection({
  title,
  children,
  id,
  defaultOpen = false,
}: {
  title: string
  children: ReactNode
  id?: string
  defaultOpen?: boolean
}) {
  return (
    <details
      id={id}
      open={defaultOpen}
      className="group border border-gray-200 bg-white open:shadow-sm"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="text-base font-bold text-ink-900 sm:text-lg">
          {title}
        </span>
        <span
          aria-hidden
          className="relative flex h-7 w-7 shrink-0 items-center justify-center bg-primary-500 text-white"
        >
          {/* horizontal bar (always shown) */}
          <span className="block h-0.5 w-3.5 bg-white" />
          {/* vertical bar (hidden when open) */}
          <span className="absolute block h-3.5 w-0.5 bg-white transition-transform duration-150 group-open:rotate-90 group-open:opacity-0" />
        </span>
      </summary>
      <div className="space-y-4 border-t border-gray-100 px-5 py-5 sm:px-6 sm:py-6">
        {children}
      </div>
    </details>
  )
}

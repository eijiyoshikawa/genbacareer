"use client"

import { Suspense, useEffect, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * ページ遷移中にトップに細いプログレスバーを表示するクライアントコンポーネント。
 * Next.js App Router の router cache 経由でも体感速度が向上するよう、
 * クリック直後に 100ms 遅延で 0→80% まで一気にアニメーションし、
 * pathname / searchParams が変わったタイミングで 100% へ仕上げて消える。
 *
 * 外部依存なしの自前実装。
 */
export function NavigationProgress() {
  return (
    <Suspense fallback={null}>
      <NavigationProgressInner />
    </Suspense>
  )
}

function NavigationProgressInner() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [progress, setProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  // 同一タブ内のリンククリックを検出して開始
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.button !== 0) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const target = (e.target as HTMLElement | null)?.closest?.("a")
      if (!target) return
      const href = target.getAttribute("href")
      if (!href) return
      if (href.startsWith("#") || target.target === "_blank") return
      try {
        const url = new URL(href, window.location.href)
        if (url.origin !== window.location.origin) return
        if (
          url.pathname === window.location.pathname &&
          url.search === window.location.search
        ) {
          return
        }
      } catch {
        return
      }
      setVisible(true)
      setProgress(20)
    }
    document.addEventListener("click", onClick, { capture: true })
    return () => document.removeEventListener("click", onClick, { capture: true })
  }, [])

  // 開始後、徐々に 80% へ近づける
  useEffect(() => {
    if (!visible) return
    const id = window.setInterval(() => {
      setProgress((p) => (p < 80 ? p + (80 - p) * 0.18 : p))
    }, 120)
    return () => window.clearInterval(id)
  }, [visible])

  // pathname / searchParams が変わったら 100% へ → 直後に非表示
  useEffect(() => {
    if (!visible) return
    setProgress(100)
    const id = window.setTimeout(() => {
      setVisible(false)
      setProgress(0)
    }, 180)
    return () => window.clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      aria-hidden
      className="fixed inset-x-0 top-0 z-[60] h-0.5 pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-primary-500 via-primary-400 to-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)] transition-[width] duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

"use client"

import { useEffect } from "react"

/**
 * `?auto=1` で開かれた時にブラウザの印刷ダイアログを自動で開く。
 * 共有 URL から「PDF として保存」へ直結するためのトリガー。
 */
export function PrintTrigger() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.print()
      } catch {
        // pop-up blocker など — 失敗してもページは見られる
      }
    }, 600)
    return () => window.clearTimeout(timer)
  }, [])
  return null
}

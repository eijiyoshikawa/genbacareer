"use client"

import { useEffect } from "react"

export function PrintTrigger() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        window.print()
      } catch {
        // pop-up blocker など — 失敗してもページは見られる
      }
    }, 600)
    return () => window.clearTimeout(t)
  }, [])
  return null
}

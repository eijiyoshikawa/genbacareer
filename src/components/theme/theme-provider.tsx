"use client"

/**
 * 16.6 テーマ切り替え (ダーク / ライト / システム)。
 *
 * - localStorage("theme") に "dark" | "light" | "system" を保存
 * - "system" のときは prefers-color-scheme に追随
 * - <html> に "dark" クラスを付け外しする
 * - SSR で flicker しないよう、layout の <head> に初期化スクリプトを
 *   inline している (theme-script.tsx 参照)
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"

export type ThemeChoice = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: ThemeChoice
  resolved: "light" | "dark"
  setTheme: (next: ThemeChoice) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const STORAGE_KEY = "theme"

function getSystemPref(): "light" | "dark" {
  if (typeof window === "undefined") return "light"
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

function applyHtmlClass(resolved: "light" | "dark") {
  if (typeof document === "undefined") return
  const root = document.documentElement
  if (resolved === "dark") {
    root.classList.add("dark")
  } else {
    root.classList.remove("dark")
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("system")
  const [resolved, setResolved] = useState<"light" | "dark">("light")

  // 初回マウント: localStorage から読み込み
  useEffect(() => {
    const stored = (typeof window !== "undefined"
      ? window.localStorage.getItem(STORAGE_KEY)
      : null) as ThemeChoice | null
    const initial: ThemeChoice =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "system"
    setThemeState(initial)
  }, [])

  // theme 変更 → resolved 計算 → DOM 反映
  useEffect(() => {
    const r = theme === "system" ? getSystemPref() : theme
    setResolved(r)
    applyHtmlClass(r)
  }, [theme])

  // system のときは OS 設定の変更にも追随
  useEffect(() => {
    if (theme !== "system") return
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onChange = () => {
      const r = mq.matches ? "dark" : "light"
      setResolved(r)
      applyHtmlClass(r)
    }
    mq.addEventListener("change", onChange)
    return () => mq.removeEventListener("change", onChange)
  }, [theme])

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // private mode などで localStorage 書込不可でも黙って無視
    }
  }, [])

  const value = useMemo(() => ({ theme, resolved, setTheme }), [theme, resolved, setTheme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error("useTheme must be used inside <ThemeProvider>")
  }
  return ctx
}

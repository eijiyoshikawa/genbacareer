"use client"

import { useTheme, type ThemeChoice } from "./theme-provider"
import { Sun, Moon, Monitor } from "lucide-react"

/**
 * ヘッダー右上に置く 3 値トグル: light / dark / system。
 * 視覚的にコンパクトな segmented control 風。
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options: { value: ThemeChoice; label: string; Icon: typeof Sun }[] = [
    { value: "light", label: "ライト", Icon: Sun },
    { value: "dark", label: "ダーク", Icon: Moon },
    { value: "system", label: "システム", Icon: Monitor },
  ]

  return (
    <div
      role="group"
      aria-label="テーマ切り替え"
      className="inline-flex border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900"
    >
      {options.map(({ value, label, Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            type="button"
            onClick={() => setTheme(value)}
            aria-label={`テーマ: ${label}`}
            aria-pressed={active}
            title={label}
            className={`flex h-8 w-8 items-center justify-center transition ${
              active
                ? "bg-primary-500 text-white"
                : "text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            }`}
          >
            <Icon className="h-4 w-4" />
          </button>
        )
      })}
    </div>
  )
}

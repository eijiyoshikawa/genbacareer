"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"

/**
 * ヘッダー右端のログアウトボタン。
 *
 * NextAuth の signOut は Client コンポーネントから呼ぶ必要があるため、
 * 親 Header (Server Component) から薄く分離。
 */
export function HeaderLogoutButton({
  variant = "desktop",
}: {
  variant?: "desktop" | "mobile"
}) {
  const handle = async () => {
    await signOut({ callbackUrl: "/" })
  }

  if (variant === "mobile") {
    return (
      <button
        type="button"
        onClick={handle}
        className="press flex h-14 w-full items-center justify-center gap-2 border border-gray-200 bg-white text-base font-bold text-gray-700 hover:bg-gray-50"
      >
        <LogOut className="h-5 w-5" />
        ログアウト
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handle}
      className="ml-1 flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 hover:text-primary-600 transition"
    >
      <LogOut className="h-4 w-4" />
      ログアウト
    </button>
  )
}

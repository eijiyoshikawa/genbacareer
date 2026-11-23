"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * Google 経由のログイン / 新規登録ボタン (求職者向け)。
 *
 * 内部で NextAuth の Google プロバイダ `signIn("google")` を呼ぶだけ。
 * 認可後の動作は auth.ts の signIn callback がハンドルする:
 *   - users を upsert (新規 or 既存リンク) / authProvider: "google"
 *   - emailVerified を自動セット（Google 検証済みのため）
 * 認可後 callbackUrl にリダイレクト (既定 /mypage)。
 *
 * ⚠️ 環境変数 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET が未設定だと
 *    NextAuth が Google プロバイダを登録しないため、押下時にエラーになる。
 */
export function GoogleLoginButton({
  label = "Google で登録",
  callbackUrl = "/mypage",
  size = "md",
  fullWidth = true,
}: {
  label?: string
  callbackUrl?: string
  size?: "md" | "lg"
  fullWidth?: boolean
}) {
  const [loading, setLoading] = useState(false)

  const onClick = async () => {
    setLoading(true)
    try {
      await signIn("google", { callbackUrl })
    } finally {
      setLoading(false)
    }
  }

  const sizeCls = size === "lg" ? "h-14 text-base" : "h-12 text-sm"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className={`press inline-flex items-center justify-center gap-2 font-extrabold text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 shadow-sm disabled:opacity-60 transition ${sizeCls} ${fullWidth ? "w-full px-5" : "px-6"}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
      ) : (
        <svg aria-hidden viewBox="0 0 48 48" className="h-5 w-5">
          <path
            fill="#EA4335"
            d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
          />
          <path
            fill="#4285F4"
            d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
          />
          <path
            fill="#FBBC05"
            d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
          />
          <path
            fill="#34A853"
            d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
          />
        </svg>
      )}
      <span>{loading ? "Google に接続中..." : label}</span>
    </button>
  )
}

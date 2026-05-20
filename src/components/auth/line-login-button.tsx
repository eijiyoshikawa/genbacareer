"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { Loader2 } from "lucide-react"

/**
 * LINE 経由のログイン / 新規登録ボタン (求職者向け)。
 *
 * 内部で NextAuth の LINE プロバイダ `signIn("line")` を呼ぶだけ。
 * 認可成功後の動作は auth.ts の signIn callback でハンドルされる:
 *   - email が来た → users テーブルを upsert (新規 or 既存リンク)
 *   - authProvider: "line"
 *   - role: "seeker" 固定
 *   - emailVerified を自動セット
 * 認可後 callbackUrl にリダイレクト (既定 /mypage)。
 *
 * 環境変数 LINE_CLIENT_ID / LINE_CLIENT_SECRET が未設定だと NextAuth が
 * 401 を返すため、本番投入前に必ず設定すること。
 */
export function LineLoginButton({
  label = "LINE で 1 タップ登録",
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
      await signIn("line", { callbackUrl })
    } finally {
      // 通常はリダイレクトで unmount されるためここまで来ない
      setLoading(false)
    }
  }

  const sizeCls =
    size === "lg" ? "h-14 text-base" : "h-12 text-sm"

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      aria-label={label}
      className={`press inline-flex items-center justify-center gap-2 font-extrabold text-white bg-[#06C755] hover:bg-[#05B14A] shadow-sm disabled:opacity-60 transition ${sizeCls} ${fullWidth ? "w-full px-5" : "px-6"}`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        // LINE ロゴ風シンプル吹き出し
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-5 w-5"
          fill="currentColor"
        >
          <path d="M12 3C6.48 3 2 6.79 2 11.46c0 2.86 1.96 5.39 4.93 6.85-.13.5-.86 3.31-.88 3.4 0 0-.02.14.08.2.1.05.21.01.21.01.31-.04 3.62-2.4 4.2-2.79.46.07.94.1 1.46.1 5.52 0 10-3.79 10-8.46S17.52 3 12 3z" />
        </svg>
      )}
      <span>{loading ? "LINE に接続中..." : label}</span>
    </button>
  )
}

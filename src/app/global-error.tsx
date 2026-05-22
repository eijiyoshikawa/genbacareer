"use client"

/**
 * グローバル エラーバウンダリ。
 *
 * Root layout が壊れたとき、または app/error.tsx より上位で例外が起きたときに
 * Next.js が表示する最終フォールバック。
 *
 * <html> / <body> を自前で出す必要がある（layout に依存できない）。
 * next/link も同様に避けて素の <a> を使う。
 */
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect } from "react"
import * as Sentry from "@sentry/nextjs"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[global-error]", error)
    Sentry.captureException(error, {
      tags: { boundary: "global" },
      extra: { digest: error.digest },
      level: "fatal",
    })
  }, [error])

  return (
    <html lang="ja">
      <body
        style={{
          margin: 0,
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          background: "#f8f5f0",
          color: "#333",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "#fff",
            border: "1px solid #e5e7eb",
            padding: "32px 24px",
            textAlign: "center",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "#888",
              fontWeight: 700,
            }}
          >
            ゲンバキャリア
          </p>
          <h1 style={{ margin: "12px 0 8px", fontSize: 22, color: "#111" }}>
            予期しないエラーが発生しました
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "#666", lineHeight: 1.7 }}>
            ご不便をおかけして申し訳ありません。
            <br />
            時間をおいて再度お試しください。
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 16,
                fontSize: 11,
                fontFamily: "monospace",
                color: "#999",
                background: "#f5f5f5",
                display: "inline-block",
                padding: "4px 8px",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <div style={{ marginTop: 24, display: "flex", gap: 12, justifyContent: "center" }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: "#16a34a",
                color: "#fff",
                border: "none",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              再読み込み
            </button>
            <a
              href="/"
              style={{
                background: "#fff",
                color: "#333",
                border: "1px solid #d4d4d4",
                padding: "10px 20px",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              トップへ戻る
            </a>
          </div>
        </div>
      </body>
    </html>
  )
}

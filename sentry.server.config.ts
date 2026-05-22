/**
 * Server-side Sentry 初期化。
 * Server Components / Route Handlers / Server Actions のエラーをキャプチャ。
 *
 * SENTRY_DSN が未設定時は完全に no-op（運用上影響なし）。
 */

import * as Sentry from "@sentry/nextjs"

const dsn = process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    // 本番のみサンプリング 100%、preview/dev は控えめ
    tracesSampleRate:
      process.env.VERCEL_ENV === "production" ? 0.1 : 0,
    // PII を含む可能性のある data は送らない
    sendDefaultPii: false,
    // SDK が自動付与する Breadcrumb は console.log を除外
    integrations: (defaults) =>
      defaults.filter((i) => i.name !== "Console"),
  })
}

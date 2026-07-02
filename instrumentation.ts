/**
 * Next.js 15 instrumentation hook。
 *
 * サーバー起動時に Sentry サーバ / Edge config を動的 import する。
 * sentry.server.config.ts / sentry.edge.config.ts に直接書く方式は
 * Next.js 16 で deprecated になる予定なので、現行のうちに instrumentation
 * パターンへ移行しておく。
 *
 * 参考: https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

import * as Sentry from "@sentry/nextjs"

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config")

    // 本番 DB が `prisma db push` 未反映でも 500 を防ぐセルフヒーリング。
    // 従来は src/app/layout.tsx の RootLayout でのみ呼んでいたが、Route
    // Handler (/api/**) は React tree を経由しないため RootLayout が
    // 一度も実行されないサーバーレス関数では ensureSchema が永遠に走らず、
    // P2022 (column does not exist) が API 専用 lambda で再発し続けていた。
    // instrumentation.ts の register() はランタイム起動時に一度だけ、
    // ページ/API 問わず必ず呼ばれるためここで確実に走らせる。
    const { ensureSchema } = await import("@/lib/ensure-schema")
    void ensureSchema()
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

/**
 * Next.js 15 の onRequestError hook。
 * Route Handler / Server Component で起きたエラーを自動的に Sentry に送る。
 */
export const onRequestError = Sentry.captureRequestError

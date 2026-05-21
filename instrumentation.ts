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

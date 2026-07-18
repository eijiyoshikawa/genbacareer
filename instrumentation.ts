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

    // スキーマ自己修復 (ensureSchema) を cold start 時に必ず一度実行する。
    // これまで src/app/layout.tsx の fire-and-forget 呼び出しのみに依存していたため、
    // /api/auth/[...nextauth] のような API-only route（layout を経由しない）の
    // lambda インスタンスがページ描画より先にリクエストを受けると、
    // 未反映カラム参照で 500 (例: "column users.avatar_url does not exist") になっていた。
    // register() は全ルート共通の cold start フックなので、ここで待機実行すれば
    // 最初のリクエストが来る前にスキーマ同期が完了する。
    const { ensureSchema } = await import("./src/lib/ensure-schema")
    await ensureSchema().catch(() => {})
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

/**
 * GET /api/admin/sentry-test
 *
 * Sentry が正しく接続できているかをテストするエンドポイント。
 * 管理者のみアクセス可能。意図的に例外を投げて Sentry に届くかを確認する。
 *
 * 使い方:
 *   admin としてログイン後にブラウザで開く
 *   →   "Sentry test error fired" メッセージが表示されれば送信成功
 *   →   Sentry Dashboard で 1 分以内にイベント受信を確認
 *
 * 本番環境でも実行可（テスト目的）。エラー自体は 500 を返すが捕捉される。
 */

import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"
import * as Sentry from "@sentry/nextjs"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // 意図的なエラー
  const id = Sentry.captureMessage("Sentry connectivity test fired", "info")
  try {
    throw new Error("Sentry test exception — intentional")
  } catch (e) {
    Sentry.captureException(e, { tags: { test: "true" } })
  }

  return NextResponse.json({
    ok: true,
    message:
      "Sentry にテストイベントを送信しました。Sentry Dashboard で 1 分以内に受信できているかご確認ください。",
    eventId: id,
    sentryConfigured: !!(
      process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
    ),
  })
}

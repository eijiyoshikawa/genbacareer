import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { isGbizConfigured } from "@/lib/gbizinfo"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * 拡張ヘルスチェック。
 *
 * - GET /api/health           軽量チェック (DB 接続 + デプロイ情報)
 * - GET /api/health?full=1    全項目チェック (必須 env / 任意 env / Cron 設定)
 *
 * 200 = 健全 / 503 = どこか NG。CD パイプラインや uptime 監視で利用。
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const full = url.searchParams.get("full") === "1"

  const checks: Record<string, { ok: boolean; detail?: string }> = {}

  // 1) DB 接続 — 軽量クエリで pgbouncer 経由の疎通確認
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { ok: true }
  } catch (e) {
    checks.database = {
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
    }
  }

  if (full) {
    // 2) 必須環境変数
    const requiredEnvs = [
      "DATABASE_URL",
      "DIRECT_URL",
      "NEXTAUTH_SECRET",
      "NEXTAUTH_URL",
      "NEXT_PUBLIC_BASE_URL",
    ] as const
    const missing = requiredEnvs.filter((k) => !process.env[k])
    checks.env_required = {
      ok: missing.length === 0,
      detail: missing.length > 0 ? `missing: ${missing.join(", ")}` : undefined,
    }

    // 3) 任意 / 推奨環境変数の有無
    const optional = {
      GBIZ_API_TOKEN: isGbizConfigured(),
      CRON_SECRET: !!process.env.CRON_SECRET,
      RESEND_API_KEY: !!process.env.RESEND_API_KEY,
      SENTRY_DSN: !!process.env.SENTRY_DSN,
      GA_ID: !!process.env.NEXT_PUBLIC_GA_ID,
      GSC_VERIFICATION: !!process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    }
    checks.env_optional = {
      ok: true,
      detail: JSON.stringify(optional),
    }

    // 4) Cron 設定
    checks.cron = {
      ok: !!process.env.CRON_SECRET,
      detail: process.env.CRON_SECRET ? "configured" : "CRON_SECRET not set",
    }
  }

  const allOk = Object.values(checks).every((c) => c.ok)

  return NextResponse.json(
    {
      status: allOk ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      deploy: {
        commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
        branch: process.env.VERCEL_GIT_COMMIT_REF ?? "unknown",
        env: process.env.VERCEL_ENV ?? "development",
        region: process.env.VERCEL_REGION ?? "unknown",
      },
      checks,
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex",
      },
    }
  )
}

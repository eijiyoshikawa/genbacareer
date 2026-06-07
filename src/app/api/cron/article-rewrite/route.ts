/**
 * マガジン記事 SEO 自動リライト cron。
 *
 * GET/POST /api/cron/article-rewrite
 *  - Bearer CRON_SECRET 認証
 *  - GSC データ（直近 28 日）から PV 改善余地の大きい記事を上位 3 本選定
 *  - 実クエリに沿って Claude でリライト → 版退避 → 自動公開
 *
 * 安全機構:
 *  - キルスイッチ ARTICLE_REWRITE_ENABLED が "true" でなければ dry-run（候補のみ）
 *  - ?dryRun=1 で明示的に dry-run（手動確認用）
 *  - ?limit=N で本数を上書き（既定 3）
 *
 * Vercel Cron 想定: 3 日に 1 回 06:00 UTC（JST 15:00）
 */

import { runArticleRewrite } from "@/lib/article-rewrite"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

async function handler(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get("dryRun") === "1"
  const limitParam = url.searchParams.get("limit")
  const limit = limitParam ? Math.max(1, Math.min(10, Number(limitParam))) : undefined

  const startedAt = Date.now()
  try {
    const summary = await runArticleRewrite({
      ...(dryRun ? { dryRun: true } : {}),
      ...(limit ? { limit } : {}),
    })
    return Response.json({
      ok: true,
      durationMs: Date.now() - startedAt,
      ...summary,
    })
  } catch (e) {
    console.error("[cron/article-rewrite] failed:", e)
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

export const GET = handler
export const POST = handler

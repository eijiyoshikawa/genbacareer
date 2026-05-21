/**
 * POST /api/cron/refresh-mv
 *
 * カテゴリ件数 materialized view を CONCURRENTLY でリフレッシュする cron。
 * Vercel Cron で 5〜10 分間隔程度を想定。
 *
 * CONCURRENTLY は読み取りをブロックしないが、UNIQUE INDEX が必須。
 * 失敗時は警告 + 200 を返す（cron が無限にリトライ走らないように）。
 */

import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 60

const MATERIALIZED_VIEWS = [
  "job_category_counts",
  "job_pref_category_counts",
] as const

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const startedAt = new Date()
  const results: Record<string, string> = {}

  for (const mv of MATERIALIZED_VIEWS) {
    try {
      // CONCURRENTLY: 読み取りクエリをブロックしない
      await prisma.$executeRawUnsafe(
        `REFRESH MATERIALIZED VIEW CONCURRENTLY ${mv}`
      )
      results[mv] = "ok"
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // CONCURRENTLY が失敗 (UNIQUE INDEX 不在など) → 通常 REFRESH にフォールバック
      try {
        await prisma.$executeRawUnsafe(`REFRESH MATERIALIZED VIEW ${mv}`)
        results[mv] = "ok (non-concurrent)"
      } catch (e2) {
        results[mv] = `failed: ${e2 instanceof Error ? e2.message : e2} (orig: ${msg})`
      }
    }
  }

  return Response.json({
    timestamp: startedAt.toISOString(),
    results,
  })
}

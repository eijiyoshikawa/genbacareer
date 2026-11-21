import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { fetchSnapshot, isGbizConfigured } from "@/lib/gbizinfo"

/**
 * GbizINFO データ月次自動更新 Cron。
 *
 * - corporate_number が設定された Company を対象に、最終取得から
 *   28 日以上経過したものを再フェッチする。
 * - GbizINFO API レート制限（1 秒 5 リクエスト）を守る。1 社あたり 3 リクエスト
 *   (基本 / 届出認定 / 表彰) を並列で投げるため、700ms 間隔で実行する。
 * - 1 回の Cron で最大 200 社まで。制限時間が近づいたら途中で打ち切り、
 *   残りは次回に回す（gbizSyncedAt の古い順なので取りこぼしは出ない）。
 *
 * Vercel Cron Jobs 設定例 (vercel.json):
 *   { "path": "/api/cron/refresh-gbiz", "schedule": "0 3 1 * *" }
 *   → 毎月 1 日 03:00 JST に実行
 *
 * Authorization: Bearer ${CRON_SECRET} で認証。
 */

const STALE_MS = 28 * 24 * 60 * 60 * 1000
const RATE_INTERVAL_MS = 700
const MAX_PER_RUN = 200

export const maxDuration = 300
// maxDuration の手前で自主的に止める (途中で kill されると結果 JSON も残らない)
const DEADLINE_MS = 240_000

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!isGbizConfigured()) {
    return Response.json(
      { skipped: true, reason: "GBIZ_API_TOKEN not configured" },
      { status: 200 }
    )
  }

  const startedAt = Date.now()
  const cutoff = new Date(startedAt - STALE_MS)

  // 再取得対象: corporate_number あり、かつ gbiz_synced_at が古い or 未取得
  const targets = await prisma.company.findMany({
    where: {
      corporateNumber: { not: null },
      OR: [{ gbizSyncedAt: null }, { gbizSyncedAt: { lt: cutoff } }],
    },
    select: { id: true, corporateNumber: true },
    orderBy: { gbizSyncedAt: { sort: "asc", nulls: "first" } },
    take: MAX_PER_RUN,
  })

  let updated = 0
  let failed = 0
  let attempted = 0
  const failedIds: string[] = []

  for (const c of targets) {
    if (!c.corporateNumber) continue
    if (Date.now() - startedAt > DEADLINE_MS) break
    attempted++
    try {
      const snapshot = await fetchSnapshot(c.corporateNumber)
      if (snapshot) {
        await prisma.company.update({
          where: { id: c.id },
          data: {
            gbizData: snapshot as unknown as Prisma.InputJsonValue,
            gbizSyncedAt: new Date(),
          },
        })
        updated++
      } else {
        failed++
        failedIds.push(c.id)
      }
    } catch (e) {
      failed++
      failedIds.push(c.id)
      console.error("[cron/refresh-gbiz] failed for", c.id, e)
    }
    // レート制限保護
    await sleep(RATE_INTERVAL_MS)
  }

  return Response.json({
    processed: attempted,
    remaining: targets.length - attempted,
    updated,
    failed,
    failedIds: failedIds.slice(0, 20),
    nextRunCutoff: cutoff.toISOString(),
  })
}

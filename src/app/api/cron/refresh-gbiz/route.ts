import { prisma } from "@/lib/db"
import { Prisma } from "@prisma/client"
import { fetchSnapshot, isGbizConfigured } from "@/lib/gbizinfo"
import { isCronAuthorized, cronUnauthorizedResponse } from "@/lib/cron-auth"

/**
 * GbizINFO データ月次自動更新 Cron。
 *
 * - corporate_number が設定された Company を対象に、最終取得から
 *   28 日以上経過したものを再フェッチする。
 * - GbizINFO API レート制限（1 秒 5 リクエスト）に合わせて 250ms 間隔で実行。
 * - 1 回の Cron で最大 200 社まで DB から取得するが、実際に処理する件数は
 *   TIME_BUDGET_MS の経過時間で打ち切る（タイムアウト保護）。
 *   MAX_PER_RUN 件数だけを根拠にすると、レート制限用の sleep だけで
 *   200 * 250ms = 50s を消費し、GbizINFO API 自体の応答時間を足すと
 *   maxDuration (60s) を超えて Vercel に強制終了されてしまうため。
 *   未処理分は gbiz_synced_at が更新されないので、翌月以降の実行で自動的に
 *   優先的に再取得される（asc nulls first で並べているため）。
 *
 * Vercel Cron Jobs 設定例 (vercel.json):
 *   { "path": "/api/cron/refresh-gbiz", "schedule": "0 3 1 * *" }
 *   → 毎月 1 日 03:00 JST に実行
 *
 * Authorization: Bearer ${CRON_SECRET} で認証。
 */

const STALE_MS = 28 * 24 * 60 * 60 * 1000
const RATE_INTERVAL_MS = 250
const MAX_PER_RUN = 200
// Vercel の maxDuration (60s) に余裕を持たせて打ち切るための時間予算。
const TIME_BUDGET_MS = 45_000

export const maxDuration = 60 // Vercel function 最長 60s

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return cronUnauthorizedResponse()
  }

  if (!isGbizConfigured()) {
    return Response.json(
      { skipped: true, reason: "GBIZ_API_TOKEN not configured" },
      { status: 200 }
    )
  }

  const cutoff = new Date(Date.now() - STALE_MS)

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
  const failedIds: string[] = []
  const startedAt = Date.now()
  let timedOut = false

  for (const c of targets) {
    if (Date.now() - startedAt > TIME_BUDGET_MS) {
      timedOut = true
      break
    }
    if (!c.corporateNumber) continue
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
    targeted: targets.length,
    processed: updated + failed,
    updated,
    failed,
    failedIds: failedIds.slice(0, 20),
    timedOut,
    nextRunCutoff: cutoff.toISOString(),
  })
}

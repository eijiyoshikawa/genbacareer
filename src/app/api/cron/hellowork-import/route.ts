/**
 * HelloWork 求人取り込み Cron エンドポイント
 *
 * POST /api/cron/hellowork-import
 *
 * 認証: Bearer CRON_SECRET
 * Vercel Cron Jobs から定期実行される想定。
 *
 * 取り込み戦略:
 *   - DB の `import_progress` テーブルでローテーション状態を持ち、
 *     毎回未処理の dataId × ページを連続で取得する（P1: 全国 36 万件取り込み）
 *   - 1 ページ ≒ 1000 件 ≒ 113s なので、デフォルトは 2 ページ/回（≒226s, maxDuration=300s 内）
 *
 * クエリパラメータ（すべて任意。指定があれば DB 状態より優先）:
 *   dataId        : 取り込む dataId（例: "M100"）
 *   page          : 開始ページ番号（1〜）
 *   pages         : 連続取得するページ数（default: 2）
 *   closeOrphans  : 今回バッチに含まれない HW 求人を closed にするか（default: false。
 *                   ローテーション中は常に false にすべき。週次 fullSweep でのみ true 推奨）
 */

import {
  fetchPagesFromDataId,
  fetchKyujinByDataId,
  getToken,
  delToken,
} from "@/lib/crawler/hellowork"
import { importHelloworkJobs } from "@/lib/crawler/import-batch"
import {
  isHelloworkQuietHour,
  planNextRotation,
  recordBatchResult,
  recordRunWithoutProgress,
} from "@/lib/crawler/rotation-planner"
import { prisma } from "@/lib/db"

// 1 ページ ≒ 113 秒。pages=5 を許容するため 600 秒に拡張（Vercel Pro の serverless 上限内）。
export const maxDuration = 600
export const dynamic = "force-dynamic"

const DEFAULT_PAGES_PER_RUN = 2

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(request.url)
  const dataIdParam = url.searchParams.get("dataId")
  const pageParam = url.searchParams.get("page")
  const pagesParam = url.searchParams.get("pages")
  const closeOrphans = url.searchParams.get("closeOrphans") === "true"

  const pagesPerRun = clampInt(pagesParam, DEFAULT_PAGES_PER_RUN, 1, 5)

  const t0 = Date.now()

  // 手動で dataId/page を明示した場合は窓に関係なく実行する（運用者の判断を優先）
  if (!(dataIdParam && pageParam) && isHelloworkQuietHour()) {
    return Response.json({
      success: true,
      skipped: "hellowork-api-quiet-hours",
      timestamp: new Date().toISOString(),
    })
  }

  try {
    // ---- 1. 取り込み計画を決定 ----
    let dataId: string
    let startPage: number

    if (dataIdParam && pageParam) {
      // 明示指定: 進捗テーブルを無視して指定どおりに取り込む（手動制御）
      dataId = dataIdParam
      startPage = clampInt(pageParam, 1, 1, 100000)
    } else {
      const plan = await planNextRotation(prisma, pagesPerRun)
      dataId = plan.dataId
      startPage = plan.startPage
    }

    // ---- 2. API から N ページ分取得 ----
    const credentials = {
      id: requiredEnv("HELLOWORK_API_USER"),
      pass: requiredEnv("HELLOWORK_API_PASS"),
    }
    const token = await getToken(credentials)
    let fetchResult
    let apiUnavailable = false
    try {
      fetchResult = await fetchPagesFromDataId(
        token,
        dataId,
        startPage,
        pagesPerRun
      )
      // 途中ページから 1 件も取れなかった場合、本当に末尾なのか API が
      // 一時的にデータを返していないだけなのかを page 1 で確認する。
      // page 1 まで空なら API 側の一時不調とみなし、進捗を進めない。
      if (fetchResult.jobs.length === 0 && startPage > 1) {
        const probe = await fetchKyujinByDataId(token, dataId, 1)
        if (probe.length === 0) apiUnavailable = true
      }
    } finally {
      try {
        await delToken(token)
      } catch (e) {
        console.error(
          `[cron/hellowork-import] delToken 失敗: ${
            e instanceof Error ? e.message : e
          }`
        )
      }
    }

    if (apiUnavailable) {
      // exhausted を立てず lastRunAt だけ更新して次の dataId へ回す。
      // 進捗 (lastPage) は保持されるため、次の巡回で同じページから再開する。
      await recordRunWithoutProgress(prisma, dataId)
      console.warn(
        `[cron/hellowork-import] API がデータを返さないため進捗を保留: dataId=${dataId} page=${startPage}`
      )
      return Response.json({
        success: true,
        skipped: "hellowork-api-empty",
        dataId,
        startPage,
        durationMs: Date.now() - t0,
        timestamp: new Date().toISOString(),
      })
    }

    // ---- 3. DB に upsert ----
    const stats = await importHelloworkJobs(fetchResult.jobs, {
      dryRun: false,
      closeOrphans,
    })

    // ---- 4. 進捗テーブル更新（明示指定モードでも記録する） ----
    await recordBatchResult(prisma, {
      dataId,
      lastPage: Math.max(fetchResult.lastPage, startPage - 1),
      exhausted: fetchResult.exhausted,
      fetched: fetchResult.jobs.length,
    })

    return Response.json({
      success: true,
      dataId,
      startPage,
      pagesPerRun,
      lastPage: fetchResult.lastPage,
      exhausted: fetchResult.exhausted,
      fetched: fetchResult.jobs.length,
      created: stats.created,
      updated: stats.updated,
      closed: stats.closed,
      skipped: stats.skipped,
      errors: stats.errors,
      durationMs: Date.now() - t0,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error"
    console.error(`[cron/hellowork-import] failed: ${message}`)
    return Response.json(
      { success: false, error: message, durationMs: Date.now() - t0 },
      { status: 500 }
    )
  }
}

function clampInt(
  raw: string | null,
  defaultVal: number,
  min: number,
  max: number
): number {
  if (!raw) return defaultVal
  const n = parseInt(raw, 10)
  if (isNaN(n)) return defaultVal
  return Math.max(min, Math.min(max, n))
}

function requiredEnv(key: string): string {
  const v = process.env[key]
  if (!v) {
    throw new Error(`環境変数 ${key} が未設定`)
  }
  return v
}

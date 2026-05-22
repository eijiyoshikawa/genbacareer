/**
 * HelloWork ローテーション取り込みのローカル実行ヘルパー
 *
 * Cron 本番投入前の動作確認や、手動投入用。
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts status
 *   pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts sync
 *   pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts run [pages]
 *   pnpm tsx --env-file=.env.local scripts/hellowork-rotation.ts reset [dataId]
 *
 * status : 進捗テーブルの内容を表示
 * sync   : API の dataId 一覧と進捗テーブルを同期（不足分を追加）
 * run    : 次のローテーションを 1 バッチ実行（DB 書き込みあり）
 * reset  : 進捗をリセット（dataId 指定なしなら全件）
 */

import { PrismaClient } from "@prisma/client"
import {
  delToken,
  fetchPagesFromDataId,
  getToken,
} from "../src/lib/crawler/hellowork"
import { importHelloworkJobs } from "../src/lib/crawler/import-batch"
import {
  planNextRotation,
  recordBatchResult,
  syncDataIds,
} from "../src/lib/crawler/rotation-planner"

const prisma = new PrismaClient()

async function main() {
  const cmd = process.argv[2] ?? "status"

  switch (cmd) {
    case "status":
      await showStatus()
      break
    case "sync":
      await runSync()
      break
    case "run":
      await runBatch(parseInt(process.argv[3] ?? "2", 10))
      break
    case "reset":
      await resetProgress(process.argv[3])
      break
    default:
      console.error(`未対応コマンド: ${cmd}`)
      console.error("使える: status | sync | run [pages] | reset [dataId]")
      process.exit(1)
  }
}

async function showStatus() {
  const rows = await prisma.importProgress.findMany({
    where: { source: "hellowork" },
    orderBy: { dataId: "asc" },
  })
  if (rows.length === 0) {
    console.log("進捗テーブルが空です。`sync` で初期化してください。")
    return
  }

  const total = rows.length
  const exhausted = rows.filter((r) => r.exhausted).length
  const inProgress = rows.filter((r) => !r.exhausted && r.lastPage > 0).length
  const notStarted = rows.filter((r) => !r.exhausted && r.lastPage === 0).length
  const fetched = rows.reduce((s, r) => s + r.totalFetched, 0)

  console.log("============================================================")
  console.log(" HelloWork 取り込み進捗")
  console.log("============================================================")
  console.log(`  dataId 総数:   ${total}`)
  console.log(`  完了 (exhausted): ${exhausted}`)
  console.log(`  進行中:         ${inProgress}`)
  console.log(`  未着手:         ${notStarted}`)
  console.log(`  累計取得件数:   ${fetched}`)
  console.log("")
  console.log(" dataId  | lastPage | exhausted | totalFetched | lastRunAt")
  console.log(" --------|----------|-----------|--------------|----------")
  for (const r of rows) {
    console.log(
      ` ${r.dataId.padEnd(7)} | ${String(r.lastPage).padStart(8)} | ${
        r.exhausted ? "  ✓" : "  -"
      }       | ${String(r.totalFetched).padStart(12)} | ${
        r.lastRunAt ? r.lastRunAt.toISOString() : "-"
      }`
    )
  }
}

async function runSync() {
  console.log("API から dataId 一覧を取得して同期中…")
  const result = await syncDataIds(prisma)
  console.log(`  ✓ 取得 dataId 総数: ${result.total}, 新規追加: ${result.added}`)
}

async function runBatch(pagesPerRun: number) {
  console.log(`ローテーション実行（pagesPerRun=${pagesPerRun}）…`)

  const plan = await planNextRotation(prisma, pagesPerRun)
  console.log(`  対象: dataId=${plan.dataId}, startPage=${plan.startPage}`)

  const t0 = Date.now()
  const id = process.env.HELLOWORK_API_USER
  const pass = process.env.HELLOWORK_API_PASS
  if (!id || !pass) throw new Error("HELLOWORK_API_USER / HELLOWORK_API_PASS 未設定")

  const token = await getToken({ id, pass })
  let fetchResult
  try {
    fetchResult = await fetchPagesFromDataId(
      token,
      plan.dataId,
      plan.startPage,
      pagesPerRun
    )
  } finally {
    try {
      await delToken(token)
    } catch (e) {
      console.error(`delToken 失敗: ${e instanceof Error ? e.message : e}`)
    }
  }

  console.log(
    `  ✓ ${fetchResult.jobs.length} 件取得 (lastPage=${fetchResult.lastPage}, exhausted=${fetchResult.exhausted}, ${Date.now() - t0}ms)`
  )

  const stats = await importHelloworkJobs(fetchResult.jobs, {
    dryRun: false,
    closeOrphans: false,
  })

  await recordBatchResult(prisma, {
    dataId: plan.dataId,
    lastPage: Math.max(fetchResult.lastPage, plan.startPage - 1),
    exhausted: fetchResult.exhausted,
    fetched: fetchResult.jobs.length,
  })

  console.log(
    `  新規=${stats.created} 更新=${stats.updated} skip=${stats.skipped} エラー=${stats.errors}`
  )
}

async function resetProgress(dataId?: string) {
  const where = dataId
    ? { source: "hellowork", dataId }
    : { source: "hellowork" }
  const result = await prisma.importProgress.updateMany({
    where,
    data: { lastPage: 0, exhausted: false, totalFetched: 0 },
  })
  console.log(`  ✓ ${result.count} 行をリセットしました`)
}

main()
  .catch((e) => {
    console.error("Unhandled error:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

export {}

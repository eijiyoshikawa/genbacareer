/**
 * HelloWork API → DB 本番取り込みスクリプト（実 DB 書き込みあり）
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local scripts/run-hellowork-import.ts
 *
 * オプション環境変数:
 *   HW_IMPORT_MAX_JOBS         取得求人上限 (default: 1000)
 *   HW_IMPORT_CLOSE_ORPHANS    "true" の場合、今回バッチに含まれない HW 求人を closed にする (default: false)
 *
 * 安全のため:
 *   - デフォルトで 1 ページ (1000 件) のみ
 *   - closeOrphans=false で他データに影響を与えない
 *
 * ロールバック:
 *   DELETE FROM jobs WHERE source = 'hellowork';
 */

import { fetchAllJobs } from "../src/lib/crawler/hellowork"
import { importHelloworkJobs } from "../src/lib/crawler/import-batch"

async function main() {
  const maxJobs = parseInt(process.env.HW_IMPORT_MAX_JOBS ?? "1000", 10)
  const closeOrphans = process.env.HW_IMPORT_CLOSE_ORPHANS === "true"

  console.log("============================================================")
  console.log(" HelloWork 本番取り込み（実 DB 書き込みあり）")
  console.log("============================================================")
  console.log(`  maxJobs:      ${maxJobs}`)
  console.log(`  closeOrphans: ${closeOrphans}`)
  console.log("")

  const t0 = Date.now()

  console.log("[1/2] HelloWork API から取得中…")
  const result = await fetchAllJobs(undefined, { maxJobs })
  console.log(`  ✓ ${result.jobs.length} 件取得 (${Date.now() - t0}ms)`)

  console.log("\n[2/2] DB に upsert 中…")
  const stats = await importHelloworkJobs(result.jobs, {
    dryRun: false,
    closeOrphans,
  })

  console.log("\n========== 完了 ==========")
  console.log(`  新規:   ${stats.created}`)
  console.log(`  更新:   ${stats.updated}`)
  console.log(`  closed: ${stats.closed}`)
  console.log(`  skip(非建設業): ${stats.skipped}`)
  console.log(`  エラー: ${stats.errors}`)
  console.log(`  処理時間: ${stats.durationMs}ms`)
  console.log("\nロールバックするなら:")
  console.log("  DELETE FROM jobs WHERE source = 'hellowork';")
}

main().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})

export {}

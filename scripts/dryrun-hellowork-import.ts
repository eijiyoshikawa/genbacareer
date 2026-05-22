/**
 * HelloWork API → DB 取り込み dry-run スクリプト
 *
 * 使い方:
 *   pnpm tsx --env-file=.env.local scripts/dryrun-hellowork-import.ts
 *
 * 実行内容:
 *   1. HelloWork API から 100 件取得
 *   2. importHelloworkJobs(dryRun: true) で DB 書き込みなし統計
 *   3. データ品質サマリ（prefecture 空率、salary 取得率、category 分布など）を表示
 *
 * 機微情報は出力しません（先頭1件のメタ情報のみ短縮表示）。
 */

import { fetchAllJobs } from "../src/lib/crawler/hellowork"
import { importHelloworkJobs } from "../src/lib/crawler/import-batch"

async function main() {
  console.log("[1/3] HelloWork API から取得 (maxJobs=100)…")
  const t0 = Date.now()
  const result = await fetchAllJobs(undefined, { maxJobs: 100 })
  console.log(
    `  ✓ ${result.jobs.length} 件取得 (${Date.now() - t0}ms)`
  )

  if (result.jobs.length === 0) {
    console.error("0 件のため中断")
    process.exit(1)
  }

  // データ品質サマリ
  console.log("\n[2/3] データ品質サマリ")
  const total = result.jobs.length
  const empty = (n: number) => `${n}/${total} (${Math.round((n / total) * 100)}%)`
  const cnt = {
    prefectureFilled: result.jobs.filter((j) => j.prefecture).length,
    cityFilled: result.jobs.filter((j) => j.city).length,
    salaryMin: result.jobs.filter((j) => j.salaryMin !== null).length,
    salaryMax: result.jobs.filter((j) => j.salaryMax !== null).length,
    salaryType: result.jobs.filter((j) => j.salaryType !== null).length,
    employmentType: result.jobs.filter((j) => j.employmentType !== null).length,
    description: result.jobs.filter((j) => j.description).length,
    companyName: result.jobs.filter((j) => j.companyName && j.companyName !== "不明").length,
  }
  console.log(`  prefecture 取得率   : ${empty(cnt.prefectureFilled)}`)
  console.log(`  city 取得率         : ${empty(cnt.cityFilled)}`)
  console.log(`  companyName 取得率  : ${empty(cnt.companyName)}`)
  console.log(`  description 取得率  : ${empty(cnt.description)}`)
  console.log(`  employmentType 取得率: ${empty(cnt.employmentType)}`)
  console.log(`  salaryMin 取得率    : ${empty(cnt.salaryMin)}`)
  console.log(`  salaryMax 取得率    : ${empty(cnt.salaryMax)}`)
  console.log(`  salaryType 取得率   : ${empty(cnt.salaryType)}`)

  // employmentType 分布
  const empMap = new Map<string, number>()
  for (const j of result.jobs) {
    const k = j.employmentType ?? "null"
    empMap.set(k, (empMap.get(k) ?? 0) + 1)
  }
  console.log(`\n  employmentType 分布:`)
  for (const [k, v] of empMap.entries()) console.log(`    ${k.padEnd(12)}: ${v}`)

  // prefecture 分布（先頭5件）
  const prefMap = new Map<string, number>()
  for (const j of result.jobs) {
    const k = j.prefecture || "(空)"
    prefMap.set(k, (prefMap.get(k) ?? 0) + 1)
  }
  console.log(`\n  prefecture 分布（先頭10）:`)
  const prefSorted = Array.from(prefMap.entries()).sort((a, b) => b[1] - a[1])
  for (const [k, v] of prefSorted.slice(0, 10))
    console.log(`    ${k.padEnd(10)}: ${v}`)

  // 先頭1件サンプル（マスク済み）
  const j0 = result.jobs[0]
  console.log(`\n  先頭1件サンプル（一部マスク）:`)
  console.log(
    JSON.stringify(
      {
        helloworkId: j0.helloworkId,
        prefecture: j0.prefecture,
        city: j0.city,
        employmentType: j0.employmentType,
        salaryMin: j0.salaryMin,
        salaryMax: j0.salaryMax,
        salaryType: j0.salaryType,
        titleHead: j0.title.slice(0, 30),
        descriptionLen: j0.description?.length ?? 0,
        addressLen: j0.address?.length ?? 0,
      },
      null,
      2
    )
  )

  console.log("\n[3/3] importHelloworkJobs(dryRun=true) 実行中…")
  const stats = await importHelloworkJobs(result.jobs, {
    dryRun: true,
    closeOrphans: false,
  })

  console.log("\n========== dry-run stats ==========")
  console.log(`  created (would-be): ${stats.created}`)
  console.log(`  updated (already exists): ${stats.updated}`)
  console.log(`  errors: ${stats.errors}`)
  console.log(`  totalProcessed: ${stats.totalProcessed}`)
  console.log(`  durationMs: ${stats.durationMs}`)
}

main().catch((e) => {
  console.error("Unhandled error:", e)
  process.exit(1)
})

export {}

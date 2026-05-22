/**
 * 既存のハローワーク求人で salaryType を再判定して修正するバックフィルスクリプト。
 *
 * 修正ロジック:
 *   - rawData.chgnkeitai に「日給」「日額」が含まれる → "daily"
 *   - rawData.chgnkeitai に「時給」「時間額」が含まれる → "hourly"
 *   - rawData.chgnkeitai に「年俸」「年額」「年収」が含まれる → "annual"
 *   - rawData.chgnkeitai に「月給」「月額」が含まれる → "monthly"
 *   - chgnkeitai が無くて salaryMin が 5,000〜30,000 円 → "daily"（金額から推定）
 *
 * 使い方:
 *   tsx --env-file=.env.local scripts/backfill-salary-type.ts dryrun
 *   tsx --env-file=.env.local scripts/backfill-salary-type.ts apply
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

function inferFromKeitai(
  text: string | null | undefined
): "monthly" | "hourly" | "annual" | "daily" | null {
  if (!text) return null
  if (/日給|日額/.test(text)) return "daily"
  if (/時給|時間額/.test(text)) return "hourly"
  if (/年俸|年額|年収/.test(text)) return "annual"
  if (/月給|月額/.test(text)) return "monthly"
  return null
}

function inferFromAmount(
  amount: number | null
): "monthly" | "hourly" | "annual" | "daily" | null {
  if (amount === null || amount <= 0) return null
  if (amount < 5_000) return "hourly"
  if (amount < 30_000) return "daily"
  if (amount < 1_500_000) return "monthly"
  return "annual"
}

async function main() {
  const mode = process.argv[2] ?? "dryrun"
  if (mode !== "dryrun" && mode !== "apply") {
    console.error("usage: tsx scripts/backfill-salary-type.ts dryrun|apply")
    process.exit(1)
  }

  const jobs = await prisma.job.findMany({
    where: { source: "hellowork" },
    select: {
      id: true,
      title: true,
      salaryType: true,
      salaryMin: true,
      rawData: true,
    },
  })

  console.log(`対象 hellowork ジョブ総数: ${jobs.length}`)

  const stats = {
    unchanged: 0,
    fixedFromKeitai: 0,
    fixedFromAmount: 0,
    toDaily: 0,
    toHourly: 0,
    toAnnual: 0,
    toMonthly: 0,
  }
  const updates: Array<{ id: string; from: string | null; to: string }> = []

  for (const j of jobs) {
    const raw = j.rawData as Record<string, unknown> | null
    const keitai =
      typeof raw?.chgnkeitai === "string" ? (raw.chgnkeitai as string) : null

    const inferred =
      inferFromKeitai(keitai) ?? inferFromAmount(j.salaryMin ?? null)

    if (!inferred || inferred === j.salaryType) {
      stats.unchanged++
      continue
    }

    updates.push({ id: j.id, from: j.salaryType, to: inferred })

    if (keitai) stats.fixedFromKeitai++
    else stats.fixedFromAmount++

    if (inferred === "daily") stats.toDaily++
    else if (inferred === "hourly") stats.toHourly++
    else if (inferred === "annual") stats.toAnnual++
    else stats.toMonthly++
  }

  console.log("\n--- 集計 ---")
  console.log(`変更なし: ${stats.unchanged}`)
  console.log(`要修正: ${updates.length}`)
  console.log(`  chgnkeitai から判定: ${stats.fixedFromKeitai}`)
  console.log(`  金額レンジから判定: ${stats.fixedFromAmount}`)
  console.log(`  → daily : ${stats.toDaily}`)
  console.log(`  → hourly: ${stats.toHourly}`)
  console.log(`  → annual: ${stats.toAnnual}`)
  console.log(`  → monthly: ${stats.toMonthly}`)

  if (mode === "dryrun") {
    console.log("\n[dryrun] サンプル 10 件:")
    updates.slice(0, 10).forEach((u) =>
      console.log(`  ${u.id}: ${u.from ?? "null"} → ${u.to}`)
    )
    console.log("\napply するには `apply` を渡してください。")
  } else {
    console.log("\n--- 更新中 ---")
    let done = 0
    for (const u of updates) {
      await prisma.job.update({
        where: { id: u.id },
        data: { salaryType: u.to },
      })
      done++
      if (done % 500 === 0) console.log(`  ${done} / ${updates.length}`)
    }
    console.log(`✓ ${done} 件の salaryType を更新しました。`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})

/**
 * scripts/audit-jobs.ts
 *
 * 本番 DB に取り込まれた求人 (jobs テーブル) を機械的にスキャンし、
 * 「建設業以外の異物が混入していないか」を 3 つの観点で監査する。
 *
 * 1. カテゴリ整合性: jobs.category が CATEGORIES の value 集合に含まれているか
 * 2. 推論再評価:   `inferCategory(title, description)` で再判定し、
 *                   null（=非建設業）と判定された求人を炙り出す
 * 3. ソース別件数:  source × scraped_at 日次の件数推移（急増ソース検知）
 *
 * 削除や close は行わない（read-only）。close したい場合は
 * scripts/cleanup-non-construction-hw-jobs.ts を使うこと。
 *
 * 実行方法:
 *   pnpm tsx --env-file=.env.vercel-prod scripts/audit-jobs.ts
 *
 *   # 詳細サンプル件数を増やす
 *   pnpm tsx --env-file=.env.vercel-prod scripts/audit-jobs.ts --samples=20
 *
 *   # 特定 source だけに絞る
 *   pnpm tsx --env-file=.env.vercel-prod scripts/audit-jobs.ts --source=hellowork
 */

import { prisma } from "@/lib/db"
import { CATEGORIES } from "@/lib/categories"
import { inferCategory } from "@/lib/crawler/import-batch"

type Args = { samples: number; source: string | null }

function parseArgs(): Args {
  const samplesArg = process.argv.find((a) => a.startsWith("--samples="))
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))
  return {
    samples: samplesArg ? Number(samplesArg.split("=")[1]) : 5,
    source: sourceArg ? sourceArg.split("=")[1] : null,
  }
}

const VALID_CATEGORY_VALUES = new Set(CATEGORIES.map((c) => c.value))

async function auditUnknownCategories(source: string | null): Promise<void> {
  console.info("\n=== [1/3] カテゴリ整合性チェック ===")
  const where = source ? { source } : {}
  const grouped = await prisma.job.groupBy({
    by: ["category"],
    where,
    _count: { _all: true },
  })

  const unknown = grouped.filter((g) => !VALID_CATEGORY_VALUES.has(g.category))
  if (unknown.length === 0) {
    console.info(
      "✅ 未定義カテゴリの求人はありません（全件が CATEGORIES に登録された value に一致）"
    )
  } else {
    console.warn("⚠️  未定義カテゴリの求人が見つかりました:")
    for (const g of unknown) {
      console.warn(`  - "${g.category}": ${g._count._all.toLocaleString()} 件`)
    }
  }

  console.info("\n  カテゴリ別件数:")
  for (const g of grouped.sort((a, b) => b._count._all - a._count._all)) {
    const mark = VALID_CATEGORY_VALUES.has(g.category) ? "  " : "❌"
    console.info(
      `  ${mark} ${g.category.padEnd(20)} ${g._count._all.toLocaleString().padStart(10)} 件`
    )
  }
}

async function auditMisclassified(args: Args): Promise<void> {
  console.info("\n=== [2/3] inferCategory 再判定（非建設業の炙り出し） ===")
  const where = {
    status: "active",
    ...(args.source ? { source: args.source } : {}),
  }

  const total = await prisma.job.count({ where })
  console.info(`  対象: status='active'${args.source ? ` source='${args.source}'` : ""} ${total.toLocaleString()} 件`)

  const batchSize = 1000
  let cursor: string | undefined
  let scanned = 0
  let suspicious = 0
  const samplesByCurrentCategory = new Map<
    string,
    Array<{ id: string; title: string }>
  >()

  while (true) {
    const jobs: Array<{
      id: string
      title: string
      description: string | null
      category: string
    }> = await prisma.job.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, description: true, category: true },
    })
    if (jobs.length === 0) break

    for (const job of jobs) {
      scanned++
      const inferred = inferCategory(job.title, job.description)
      if (inferred === null) {
        suspicious++
        const list = samplesByCurrentCategory.get(job.category) ?? []
        if (list.length < args.samples) {
          list.push({ id: job.id, title: job.title })
          samplesByCurrentCategory.set(job.category, list)
        }
      }
    }

    cursor = jobs[jobs.length - 1].id
    if (scanned % 10000 === 0) {
      console.info(`  ... ${scanned.toLocaleString()} 件スキャン済`)
    }
  }

  console.info(`\n  スキャン: ${scanned.toLocaleString()} 件`)
  if (suspicious === 0) {
    console.info("✅ inferCategory で null 判定される求人はありません")
    return
  }
  console.warn(
    `⚠️  非建設業の疑いがある求人: ${suspicious.toLocaleString()} 件 (${((suspicious / scanned) * 100).toFixed(2)}%)`
  )
  console.warn("  現カテゴリ別 内訳とサンプル:")
  const sorted = Array.from(samplesByCurrentCategory.entries()).sort(
    (a, b) => b[1].length - a[1].length
  )
  for (const [cat, samples] of sorted) {
    console.warn(`  - category="${cat}" (サンプル ${samples.length} 件):`)
    for (const s of samples) {
      console.warn(`      [${s.id}] ${s.title}`)
    }
  }
  console.warn(
    "\n  → status='closed' に一括更新する場合:"
  )
  console.warn(
    "    pnpm tsx --env-file=.env.vercel-prod scripts/cleanup-non-construction-hw-jobs.ts --apply"
  )
}

async function auditSourceTrend(): Promise<void> {
  console.info("\n=== [3/3] ソース別 直近 7 日 取込件数 ===")
  const rows: Array<{ source: string; day: Date; count: bigint }> =
    await prisma.$queryRaw`
      SELECT source,
             date_trunc('day', created_at) AS day,
             COUNT(*)::bigint AS count
      FROM jobs
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY 1, 2
      ORDER BY 2 DESC, 3 DESC
    `

  if (rows.length === 0) {
    console.info("  直近 7 日に新規取り込みはありません")
    return
  }
  for (const r of rows) {
    const day = r.day.toISOString().slice(0, 10)
    console.info(
      `  ${day}  ${r.source.padEnd(15)} ${Number(r.count).toLocaleString().padStart(8)} 件`
    )
  }
}

async function main(): Promise<void> {
  const args = parseArgs()
  console.info("🔍 求人監査スクリプト (read-only)")
  if (args.source) console.info(`  --source=${args.source}`)
  console.info(`  --samples=${args.samples}`)

  await auditUnknownCategories(args.source)
  await auditMisclassified(args)
  await auditSourceTrend()

  console.info("\n✅ 監査完了")
}

main()
  .catch((err) => {
    console.error("❌ 監査中にエラーが発生しました:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

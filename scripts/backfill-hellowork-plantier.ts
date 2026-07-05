/**
 * source="hellowork" の Company で planTier が 0 以外になっているものを 0 に修正する
 * バックフィルスクリプト。
 *
 * 背景: upsertHelloworkCompany() の create ブロックが planTier を明示していなかったため、
 * スキーマの @default(3) がそのまま適用され、新規取り込みの HelloWork 企業が
 * 有償 direct 企業 (tier 3) と同列で上位表示されていた (import-batch.ts で修正済み)。
 * 既に作成済みの HelloWork Company にはこのバックフィルが必要。
 *
 * 使い方:
 *   tsx --env-file=.env.local scripts/backfill-hellowork-plantier.ts dryrun
 *   tsx --env-file=.env.local scripts/backfill-hellowork-plantier.ts apply
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const mode = process.argv[2] ?? "dryrun"
  if (mode !== "dryrun" && mode !== "apply") {
    console.error(
      "usage: tsx scripts/backfill-hellowork-plantier.ts dryrun|apply"
    )
    process.exit(1)
  }

  const affected = await prisma.company.findMany({
    where: { source: "hellowork", planTier: { not: 0 } },
    select: { id: true, name: true, planTier: true },
  })

  console.log(`修正対象の HelloWork 企業: ${affected.length} 件`)
  affected
    .slice(0, 10)
    .forEach((c) => console.log(`  ${c.name} (${c.id}): planTier ${c.planTier} → 0`))

  if (mode === "dryrun") {
    console.log("\napply するには `apply` を渡してください。")
  } else {
    const result = await prisma.company.updateMany({
      where: { source: "hellowork", planTier: { not: 0 } },
      data: { planTier: 0 },
    })
    console.log(`✓ ${result.count} 件の planTier を 0 に更新しました。`)
  }

  await prisma.$disconnect()
}

main().catch((e) => {
  console.error(e)
  prisma.$disconnect()
  process.exit(1)
})

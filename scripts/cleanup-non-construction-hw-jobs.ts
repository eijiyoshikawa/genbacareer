/**
 * scripts/cleanup-non-construction-hw-jobs.ts
 *
 * 既存の hellowork 求人のうち、現在の `inferCategory` ロジックで
 * 非建設業（null）と判定されるものを `status='closed'` に更新する。
 *
 * 過去の取り込み時にブロックリストが未整備だったため誤取込された
 * 介助・障害児通所支援などの求人を一掃する目的のワンショット運用スクリプト。
 *
 * 削除ではなく close にする理由:
 *   - Application モデル等から FK 参照されている可能性がある
 *   - 監査用に履歴を残す
 *   - 公開側 `/jobs` は status='active' でフィルタするため close で即非表示
 *
 * 実行方法:
 *   # 1) dry-run で件数だけ確認
 *   pnpm tsx --env-file=.env.vercel-prod scripts/cleanup-non-construction-hw-jobs.ts
 *
 *   # 2) 実適用
 *   pnpm tsx --env-file=.env.vercel-prod scripts/cleanup-non-construction-hw-jobs.ts --apply
 */

import { prisma } from "@/lib/db"
import { inferCategory } from "@/lib/crawler/import-batch"

const apply = process.argv.includes("--apply")

async function main(): Promise<void> {
  console.log(
    apply
      ? "🔴 APPLY MODE: status='closed' に実際に更新します"
      : "🟡 DRY-RUN MODE: 該当件数を表示するだけで更新しません (--apply で実適用)"
  )

  const batchSize = 500
  let cursor: string | undefined = undefined
  let scanned = 0
  let blocked = 0
  const examplesByCategory = new Map<string, Array<{ id: string; title: string }>>()

  while (true) {
    const jobs = await prisma.job.findMany({
      where: { source: "hellowork", status: "active" },
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, description: true, category: true },
    })
    if (jobs.length === 0) break

    for (const job of jobs) {
      const newCategory = inferCategory(job.title, job.description)
      if (newCategory === null) {
        blocked++
        const list = examplesByCategory.get(job.category) ?? []
        if (list.length < 3) {
          list.push({ id: job.id, title: job.title })
          examplesByCategory.set(job.category, list)
        }
        if (apply) {
          await prisma.job.update({
            where: { id: job.id },
            data: { status: "closed" },
          })
        }
      }
    }
    scanned += jobs.length
    cursor = jobs[jobs.length - 1]?.id
    process.stdout.write(
      `\r  スキャン済み: ${scanned} 件 / 非建設業判定: ${blocked} 件`
    )
  }

  console.log("\n")
  console.log("=".repeat(60))
  console.log(`スキャン総数: ${scanned} 件`)
  console.log(`非建設業判定: ${blocked} 件`)
  console.log("=".repeat(60))
  console.log("\n誤分類の例（カテゴリ別 上位 3 件）:")
  for (const [category, examples] of examplesByCategory) {
    console.log(`\n  [${category}]`)
    for (const ex of examples) {
      console.log(`    - ${ex.title.slice(0, 60)}${ex.title.length > 60 ? "..." : ""} (${ex.id})`)
    }
  }

  if (!apply) {
    console.log("\n⚠️  上記の件数で問題なければ --apply を付けて再実行してください")
  } else {
    console.log("\n✅  全件 status='closed' に更新しました")
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

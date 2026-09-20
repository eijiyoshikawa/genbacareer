/**
 * scripts/rename-company.ts
 *
 * 指定した会社名を別名へ変更する単発ツール。
 * 余分な空白・施設名/部署名を含む会社名を、正しい社名へ修正する用途。
 *
 *   例) 「株式会社仲田コーティング␣␣␣␣ＦＡ部␣町田工場」→「株式会社仲田コーティング」
 *
 * 変更先の名前が同一 source の別レコードに既に存在する場合は、unique 制約
 * 違反を避けるため **リネームではなく統合**（求人・応募を変更先へ付け替えて
 * 元レコードを削除）する。ただし求人・応募 以外の関係を持つ場合は安全のため
 * 統合せずスキップ＆報告する。
 *
 * 使い方:
 *   # dry-run
 *   pnpm tsx --env-file=.env.local scripts/rename-company.ts \
 *     --from="株式会社仲田コーティング　　　　　　　　　　　　　　　　　　ＦＡ部　町田工場" \
 *     --to="株式会社仲田コーティング"
 *
 *   # 実適用
 *   pnpm tsx --env-file=.env.local scripts/rename-company.ts --from="..." --to="..." --apply
 */

import { prisma } from "@/lib/db"

const apply = process.argv.includes("--apply")

function argOf(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3) : undefined
}

async function countBlockers(companyId: string): Promise<number> {
  const counts = await Promise.all([
    prisma.companyFollow.count({ where: { companyId } }),
    prisma.companyUser.count({ where: { companyId } }),
    prisma.companyInvitation.count({ where: { companyId } }),
    prisma.billingEvent.count({ where: { companyId } }),
    prisma.hiringBonus.count({ where: { companyId } }),
    prisma.earlyResignation.count({ where: { companyId } }),
    prisma.companyCalendarOauth.count({ where: { companyId } }),
    prisma.companyReview.count({ where: { companyId } }),
    prisma.scoutMessage.count({ where: { companyId } }),
  ])
  return counts.reduce((a, b) => a + b, 0)
}

async function main(): Promise<void> {
  const from = argOf("from")
  const to = argOf("to")
  if (!from || !to) {
    console.error('使い方: --from="現在の会社名" --to="新しい会社名" [--apply]')
    process.exit(1)
  }
  console.log(apply ? "🔴 APPLY MODE" : "🟡 DRY-RUN MODE")
  console.log(`  from: "${from}"`)
  console.log(`  to  : "${to}"\n`)

  const targets = await prisma.company.findMany({
    where: { name: from },
    select: { id: true, source: true, name: true },
  })
  if (targets.length === 0) {
    console.log("❌ 該当する会社が見つかりませんでした（会社名は完全一致で指定してください）")
    return
  }

  for (const c of targets) {
    const existing = await prisma.company.findFirst({
      where: { source: c.source, name: to, NOT: { id: c.id } },
      select: { id: true },
    })

    if (!existing) {
      // 衝突なし → 単純リネーム
      const [jobCount, appCount] = await Promise.all([
        prisma.job.count({ where: { companyId: c.id } }),
        prisma.application.count({ where: { companyId: c.id } }),
      ])
      console.log(
        `  ${apply ? "✏️ リネーム" : "[dry-run] リネーム"} id=${c.id} (source=${c.source}, 求人${jobCount}/応募${appCount})`
      )
      if (apply) {
        await prisma.company.update({ where: { id: c.id }, data: { name: to } })
      }
      continue
    }

    // 変更先が既存 → 統合
    const blockers = await countBlockers(c.id)
    if (blockers > 0) {
      console.log(
        `  ⏭️ スキップ(要手動 ${blockers}件の関係) id=${c.id}: 変更先 "${to}" が既存のため統合が必要`
      )
      continue
    }
    const [jobCount, appCount] = await Promise.all([
      prisma.job.count({ where: { companyId: c.id } }),
      prisma.application.count({ where: { companyId: c.id } }),
    ])
    console.log(
      `  ${apply ? "✅ 統合" : "[dry-run] 統合"} id=${c.id} → 既存 id=${existing.id} (求人${jobCount}/応募${appCount})`
    )
    if (apply) {
      await prisma.$transaction([
        prisma.job.updateMany({
          where: { companyId: c.id },
          data: { companyId: existing.id },
        }),
        prisma.application.updateMany({
          where: { companyId: c.id },
          data: { companyId: existing.id },
        }),
        prisma.company.delete({ where: { id: c.id } }),
      ])
    }
  }

  console.log(apply ? "\n✅ 完了" : "\n（--apply で実行）")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

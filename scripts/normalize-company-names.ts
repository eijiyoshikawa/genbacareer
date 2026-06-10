/**
 * scripts/normalize-company-names.ts
 *
 * 既存の Company.name を normalizeCompanyName で一括正規化する。
 * 「株式会社　○○」のように法人格と社名の間に入った空白を詰める。
 *
 * 使い方:
 *   # dry-run（変更対象の一覧だけ。DB は変更しない）
 *   pnpm tsx --env-file=.env.local scripts/normalize-company-names.ts
 *
 *   # 実適用
 *   pnpm tsx --env-file=.env.local scripts/normalize-company-names.ts --apply
 *
 * 注意:
 *   - 正規化後に (source, name) が既存の別レコードと衝突する場合は、
 *     unique 制約違反を避けるため **スキップして一覧表示** する（自動マージはしない）。
 *     必要なら衝突分は個別に統合してください。
 */

import { prisma } from "@/lib/db"
import { normalizeCompanyName } from "@/lib/company-name"

const apply = process.argv.includes("--apply")

async function main(): Promise<void> {
  console.log(
    apply
      ? "🔴 APPLY MODE: Company.name を正規化して更新します"
      : "🟡 DRY-RUN MODE: 変更対象の一覧のみ（--apply で実更新）"
  )

  const companies = await prisma.company.findMany({
    select: { id: true, source: true, name: true },
  })
  console.log(`  会社総数: ${companies.length}\n`)

  let changed = 0
  let conflicts = 0
  let updated = 0

  for (const c of companies) {
    const next = normalizeCompanyName(c.name)
    if (next === c.name) continue
    changed++

    // 正規化後に同一 (source, name) が既に存在すると unique 制約に違反する
    const clash = await prisma.company.findFirst({
      where: { source: c.source, name: next, NOT: { id: c.id } },
      select: { id: true },
    })
    if (clash) {
      conflicts++
      console.log(`  ⚠️ 衝突スキップ: "${c.name}" → "${next}" (既存 id=${clash.id})`)
      continue
    }

    console.log(`  ${apply ? "✏️ " : "[dry-run]"} "${c.name}" → "${next}"`)
    if (apply) {
      await prisma.company.update({ where: { id: c.id }, data: { name: next } })
      updated++
    }
  }

  console.log(
    `\n対象 ${changed} 件 / 衝突スキップ ${conflicts} 件` +
      (apply ? ` / 更新 ${updated} 件` : "（--apply で更新）")
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

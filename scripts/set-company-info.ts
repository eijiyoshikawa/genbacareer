/**
 * scripts/set-company-info.ts
 *
 * 指定した会社の基本情報（資本金・設立・従業員数）をまとめて設定する単発ツール。
 * 会社概要テーブル（求人詳細）に表示される項目を、CSV を介さず直接更新する。
 *
 * 会社名は完全一致で指定する（部分一致での誤更新を避けるため）。
 *
 * 使い方:
 *   # dry-run（更新内容の確認のみ）
 *   pnpm tsx --env-file=.env.local scripts/set-company-info.ts \
 *     --name="株式会社ゲンバ建設" --capital="1,000万円" --founded="2010年4月" --employees="50"
 *
 *   # 実適用
 *   pnpm tsx --env-file=.env.local scripts/set-company-info.ts \
 *     --name="株式会社ゲンバ建設" --capital="1,000万円" --founded="2010年4月" --employees="50" --apply
 *
 * 指定しなかった項目は変更しない（部分更新）。空文字 "" を渡すと当該項目をクリアする。
 */

import { prisma } from "@/lib/db"

const apply = process.argv.includes("--apply")

function argOf(name: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`--${name}=`))
  return a ? a.slice(name.length + 3) : undefined
}

async function main(): Promise<void> {
  const name = argOf("name")
  if (!name) {
    console.error(
      '使い方: --name="会社名(完全一致)" [--capital="..."] [--founded="..."] [--employees="..."] [--apply]'
    )
    process.exit(1)
  }

  const capital = argOf("capital")
  const founded = argOf("founded")
  const employees = argOf("employees")

  const data: {
    capital?: string | null
    foundedOn?: string | null
    employeeCount?: string | null
  } = {}
  if (capital !== undefined) data.capital = capital === "" ? null : capital
  if (founded !== undefined) data.foundedOn = founded === "" ? null : founded
  if (employees !== undefined)
    data.employeeCount = employees === "" ? null : employees

  if (Object.keys(data).length === 0) {
    console.error(
      "❌ 更新項目がありません。--capital / --founded / --employees のいずれかを指定してください"
    )
    process.exit(1)
  }

  console.log(apply ? "🔴 APPLY MODE" : "🟡 DRY-RUN MODE")
  console.log(`  name: "${name}"`)
  if (data.capital !== undefined) console.log(`  資本金   → ${data.capital ?? "(クリア)"}`)
  if (data.foundedOn !== undefined) console.log(`  設立     → ${data.foundedOn ?? "(クリア)"}`)
  if (data.employeeCount !== undefined)
    console.log(`  従業員数 → ${data.employeeCount ?? "(クリア)"}`)
  console.log("")

  const targets = await prisma.company.findMany({
    where: { name },
    select: {
      id: true,
      source: true,
      capital: true,
      foundedOn: true,
      employeeCount: true,
    },
  })
  if (targets.length === 0) {
    console.log("❌ 該当する会社が見つかりませんでした（会社名は完全一致で指定してください）")
    return
  }

  for (const c of targets) {
    console.log(
      `  ${apply ? "✏️ 更新" : "[dry-run] 更新"} id=${c.id} (source=${c.source})` +
        ` 資本金:${c.capital ?? "—"} 設立:${c.foundedOn ?? "—"} 従業員:${c.employeeCount ?? "—"}`
    )
    if (apply) {
      await prisma.company.update({ where: { id: c.id }, data })
    }
  }

  console.log(apply ? `\n✅ 完了（${targets.length}件）` : "\n（--apply で実行）")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

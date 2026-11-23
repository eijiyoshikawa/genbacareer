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
 *   # 2) 実適用（建設キーワードを含む誤判定が 0 件のときのみ実行される）
 *   pnpm tsx --env-file=.env.vercel-prod scripts/cleanup-non-construction-hw-jobs.ts --apply
 *
 *   # 3) 安全チェックを承知の上で強制適用（非推奨。誤判定を確認済みのときだけ）
 *   pnpm tsx --env-file=.env.vercel-prod scripts/cleanup-non-construction-hw-jobs.ts --apply --force
 *
 * 安全機構:
 *   - dry-run がデフォルト
 *   - 「非建設業判定なのにタイトルに強い建設キーワードを含む」求人を炙り出し、
 *     1 件でもあれば --apply を中止する（ブロックリスト誤爆の検知）。--force で上書き。
 */

import { prisma } from "@/lib/db"
import { inferCategory } from "@/lib/crawler/import-batch"

const apply = process.argv.includes("--apply")
const force = process.argv.includes("--force")

/**
 * 安全トリップワイヤー: 「非建設業」と判定されたのにタイトルに強い建設キーワードを
 * 含む求人は、ブロックリストの誤爆（建設求人の誤close）の疑いが濃い。
 * apply 前にこれらを炙り出し、0 件でなければ apply を中止する（--force で上書き）。
 */
const STRONG_CONSTRUCTION_RE =
  /土木|建築|建設|躯体|施工管理|現場監督|現場代理人|橋梁|トンネル|舗装|河川|造成|基礎工事|鳶|とび職|鉄筋|型枠|大工|足場|左官|内装|防水|塗装|解体|産廃|アスベスト|測量|重機|建設機械|クレーン|ダンプ|ショベル|ユンボ|電気工事|設備工事|配管|配線|空調|消防設備/

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
  // close 予定の ID（apply はトリップワイヤー確認後にまとめて実行）
  const toClose: string[] = []
  // 建設キーワードを含むのに非建設業判定された "疑わしい" 求人
  const suspects: Array<{ id: string; title: string; category: string }> = []

  while (true) {
    const jobs: Array<{
      id: string
      title: string
      description: string | null
      category: string
    }> = await prisma.job.findMany({
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
        toClose.push(job.id)
        const list = examplesByCategory.get(job.category) ?? []
        if (list.length < 3) {
          list.push({ id: job.id, title: job.title })
          examplesByCategory.set(job.category, list)
        }
        if (STRONG_CONSTRUCTION_RE.test(job.title)) {
          suspects.push({ id: job.id, title: job.title, category: job.category })
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

  // 安全トリップワイヤー
  console.log("\n" + "=".repeat(60))
  console.log(
    `🚨 安全チェック: 建設キーワードを含むのに非建設業判定された求人: ${suspects.length} 件`
  )
  console.log("=".repeat(60))
  if (suspects.length > 0) {
    console.log(
      "  （ブロックリスト誤爆の疑い = 建設求人を誤って close しようとしている可能性）"
    )
    for (const s of suspects.slice(0, 30)) {
      console.log(
        `    - [${s.category}] ${s.title.slice(0, 60)}${s.title.length > 60 ? "..." : ""} (${s.id})`
      )
    }
    if (suspects.length > 30) {
      console.log(`    ... ほか ${suspects.length - 30} 件`)
    }
  } else {
    console.log("  ✅ 建設キーワードを含む誤判定はありませんでした")
  }

  if (!apply) {
    console.log(
      "\n⚠️  上記の件数・安全チェックで問題なければ --apply を付けて再実行してください"
    )
    return
  }

  // apply: トリップワイヤーが 0 件でなければ中止（--force で上書き）
  if (suspects.length > 0 && !force) {
    console.error(
      `\n❌ 中止: 建設キーワードを含む求人が ${suspects.length} 件あります。` +
        `\n   inferCategory を修正するか、本当に close してよいと確認できたら --force を付けてください。`
    )
    process.exit(1)
  }

  console.log(`\n  ${toClose.length} 件を close します...`)
  let closed = 0
  for (let i = 0; i < toClose.length; i += 100) {
    const chunk = toClose.slice(i, i + 100)
    const res = await prisma.job.updateMany({
      where: { id: { in: chunk } },
      data: { status: "closed" },
    })
    closed += res.count
    process.stdout.write(`\r  close 済み: ${closed} / ${toClose.length}`)
  }
  console.log(`\n\n✅  ${closed} 件を status='closed' に更新しました`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

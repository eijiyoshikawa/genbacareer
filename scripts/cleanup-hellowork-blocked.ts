/**
 * 既存の HelloWork 求人のうち、新たに追加した除外パターン
 * (BLOCKED_OCCUPATION_PATTERN) にマッチするものを status="closed" に更新する
 * ワンショットクリーンアップスクリプト。
 *
 * - 対象: source = "hellowork" かつ status = "active" の Job
 * - 判定: title を BLOCKED_OCCUPATION_PATTERN で検査
 * - dryrun: 件数表示のみ (デフォルト)
 * - apply : 該当 Job を status="closed" に一括更新
 *
 * 実行方法:
 *   pnpm tsx --env-file=.env.local scripts/cleanup-hellowork-blocked.ts dryrun
 *   pnpm tsx --env-file=.env.local scripts/cleanup-hellowork-blocked.ts apply
 *
 * 注意:
 *  - status="closed" は論理削除。レコードは残るがサイト/sitemap には出ない。
 *  - 完全削除したい場合は別途 prisma.job.deleteMany を実行する必要があるが、
 *    Application 等のリレーションに影響するため通常は closed で十分。
 */

import { prisma } from "@/lib/db"
import { BLOCKED_OCCUPATION_PATTERN } from "@/lib/crawler/import-batch"

type Mode = "dryrun" | "apply"

const BATCH_SIZE = 500

async function main() {
  const mode = (process.argv[2] ?? "dryrun") as Mode
  if (mode !== "dryrun" && mode !== "apply") {
    console.error(`usage: cleanup-hellowork-blocked.ts <dryrun|apply>`)
    process.exit(1)
  }

  console.info(`[cleanup-hellowork-blocked] mode=${mode}`)
  console.info(`[cleanup-hellowork-blocked] pattern=${BLOCKED_OCCUPATION_PATTERN}`)

  // カテゴリ別カウンタ
  const blockedByGroup = new Map<string, number>()

  // active な hellowork 求人を id+title だけバッチ取得 → JS 側で正規表現判定
  let cursor: string | undefined = undefined
  let totalScanned = 0
  let totalBlocked = 0
  const blockedIds: string[] = []

  while (true) {
    const batch = await prisma.job.findMany({
      where: { source: "hellowork", status: "active" },
      select: { id: true, title: true },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (batch.length === 0) break

    for (const job of batch) {
      totalScanned++
      if (BLOCKED_OCCUPATION_PATTERN.test(job.title.toLowerCase())) {
        totalBlocked++
        blockedIds.push(job.id)
        const group = classifyBlockedGroup(job.title.toLowerCase())
        blockedByGroup.set(group, (blockedByGroup.get(group) ?? 0) + 1)
      }
    }

    cursor = batch[batch.length - 1].id
    if (batch.length < BATCH_SIZE) break

    if (totalScanned % 10000 === 0) {
      console.info(
        `  進捗: scan=${totalScanned} blocked=${totalBlocked}`
      )
    }
  }

  console.info(`\n=== 検出結果 ===`)
  console.info(`  active hellowork jobs:  ${totalScanned} 件`)
  console.info(`  除外パターン該当:       ${totalBlocked} 件`)
  console.info(`  グループ別:`)
  for (const [group, count] of [...blockedByGroup.entries()].sort(
    (a, b) => b[1] - a[1]
  )) {
    console.info(`    ${group.padEnd(16)} ${count} 件`)
  }

  if (mode === "dryrun") {
    console.info(`\n[dryrun] DB は変更しません。apply で実行してください。`)
    return
  }

  if (blockedIds.length === 0) {
    console.info(`\n対象 0 件のため何もしません。`)
    return
  }

  console.info(`\n[apply] ${blockedIds.length} 件を status="closed" に更新します...`)
  // ID 配列が大きい場合は分割実行
  let updated = 0
  for (let i = 0; i < blockedIds.length; i += BATCH_SIZE) {
    const chunk = blockedIds.slice(i, i + BATCH_SIZE)
    const result = await prisma.job.updateMany({
      where: { id: { in: chunk } },
      data: { status: "closed" },
    })
    updated += result.count
    console.info(`  ${updated} / ${blockedIds.length} 完了`)
  }
  console.info(`\n[apply] 完了: ${updated} 件を closed に更新しました。`)
}

/** ログ用のおおまかな分類。詳細解析が必要なら別途 */
function classifyBlockedGroup(title: string): string {
  if (/配送|宅配|軽貨物|ルート配送|デリバリー/.test(title)) return "配送"
  if (/タクシー|ハイヤー/.test(title)) return "タクシー"
  if (/バス運転|バスドライバ|路線バス|観光バス|スクールバス|高速バス|送迎バス/.test(title))
    return "バス"
  if (/消防士|消防職員|消防官|救急救命士|救急隊員/.test(title)) return "消防士"
  if (/コールセンター|テレオペレータ|電話オペレータ|テレマーケ|カスタマー|受電業務|発信業務/.test(title))
    return "コールセンター"
  if (/介護送迎|福祉送迎|送迎ドライバ|送迎運転|送迎スタッフ/.test(title))
    return "送迎"
  if (/食品衛生|食品工場|食品製造|調理補助|調理スタッフ|調理員|厨房スタッフ|衛生管理者/.test(title))
    return "食品衛生"
  if (/保育士|保育補助|保育教諭|幼稚園教諭|学童指導員|児童指導員|ベビーシッター/.test(title))
    return "保育"
  return "その他"
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

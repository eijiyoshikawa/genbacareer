/**
 * 既存の Job レコード全件で rankScore を新ロジックで再計算するワンショットスクリプト。
 *
 * 背景:
 *   ranking.ts に「品質シグナル」(給与・雇用形態・詳細欄・企業情報) を追加した。
 *   新規取込分は自動で新スコアが付くが、既に DB にある約 96k 件は旧スコアのまま。
 *   このスクリプトで一斉に再計算して、低品質求人を下位に押し下げる。
 *
 * 動作:
 *   - source 不問、status="active" の Job をバッチ取得
 *   - company を join して computeRankScore() に渡す
 *   - dryrun: 統計だけ表示
 *   - apply : 個別 UPDATE で rankScore を反映
 *
 * 実行:
 *   pnpm tsx --env-file=.env.local scripts/recompute-rank-scores.ts dryrun
 *   pnpm tsx --env-file=.env.local scripts/recompute-rank-scores.ts apply
 */

import { prisma } from "@/lib/db"
import { computeRankScore } from "@/lib/ranking"

type Mode = "dryrun" | "apply"

const BATCH_SIZE = 500
const UPDATE_CONCURRENCY = 25

async function main() {
  const mode = (process.argv[2] ?? "dryrun") as Mode
  if (mode !== "dryrun" && mode !== "apply") {
    console.error(`usage: recompute-rank-scores.ts <dryrun|apply>`)
    process.exit(1)
  }

  console.info(`[recompute-rank-scores] mode=${mode}`)

  let cursor: string | undefined = undefined
  let scanned = 0
  let changed = 0
  let updated = 0

  // 統計用: スコア分布
  const buckets = new Map<string, number>()
  const bucket = (s: number): string => {
    if (s < 0) return "< 0 (低品質)"
    if (s === 0) return "0"
    if (s < 10) return "1-9"
    if (s < 30) return "10-29"
    if (s < 60) return "30-59"
    if (s < 100) return "60-99"
    return "100+"
  }

  while (true) {
    const batch = await prisma.job.findMany({
      where: { status: "active" },
      select: {
        id: true,
        rankScore: true,
        description: true,
        requirements: true,
        salaryMin: true,
        salaryMax: true,
        employmentType: true,
        workHours: true,
        holidays: true,
        insurance: true,
        bonus: true,
        commuteAllowance: true,
        companyFeatures: true,
        businessContent: true,
        company: {
          select: {
            tagline: true,
            pitchHighlights: true,
            idealCandidate: true,
            employeeVoice: true,
            photos: true,
            instagramUrl: true,
            tiktokUrl: true,
            facebookUrl: true,
            xUrl: true,
            youtubeUrl: true,
            lastContentUpdatedAt: true,
          },
        },
      },
      orderBy: { id: "asc" },
      take: BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    })
    if (batch.length === 0) break

    const updates: Array<{ id: string; newScore: number }> = []
    for (const job of batch) {
      scanned++
      const newScore = computeRankScore(job, job.company)
      buckets.set(bucket(newScore), (buckets.get(bucket(newScore)) ?? 0) + 1)
      if (newScore !== job.rankScore) {
        changed++
        updates.push({ id: job.id, newScore })
      }
    }

    if (mode === "apply" && updates.length > 0) {
      // 並列 UPDATE (個別行ごとに値が違うため updateMany 不可)
      for (let i = 0; i < updates.length; i += UPDATE_CONCURRENCY) {
        const chunk = updates.slice(i, i + UPDATE_CONCURRENCY)
        await Promise.all(
          chunk.map((u) =>
            prisma.job.update({
              where: { id: u.id },
              data: { rankScore: u.newScore },
            })
          )
        )
        updated += chunk.length
      }
    }

    cursor = batch[batch.length - 1].id
    if (batch.length < BATCH_SIZE) break

    if (scanned % 10000 === 0) {
      console.info(
        `  進捗: scan=${scanned} changed=${changed} updated=${updated}`
      )
    }
  }

  console.info(`\n=== 結果 ===`)
  console.info(`  scanned: ${scanned} 件`)
  console.info(`  changed: ${changed} 件 (スコア差分あり)`)
  if (mode === "apply") {
    console.info(`  updated: ${updated} 件 (実 UPDATE 件数)`)
  }
  console.info(`\n=== 新スコア分布 ===`)
  const order = ["< 0 (低品質)", "0", "1-9", "10-29", "30-59", "60-99", "100+"]
  for (const key of order) {
    const count = buckets.get(key) ?? 0
    const pct = scanned > 0 ? ((count / scanned) * 100).toFixed(1) : "0"
    console.info(`  ${key.padEnd(12)} ${count.toString().padStart(7)} 件 (${pct}%)`)
  }

  if (mode === "dryrun") {
    console.info(`\n[dryrun] DB は変更しません。apply で実行してください。`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

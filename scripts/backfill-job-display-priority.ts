/**
 * scripts/backfill-job-display-priority.ts
 *
 * 既存求人すべてに対し computeDisplayPriority() を実行し、
 * Job.displayPriority カラムにバックフィルする。
 *
 * 前提:
 *   - prisma/migrations/manual/jobs_display_priority.sql を先に実行済み
 *     （カラムは default=5 で作成済み）
 *
 * 実行方法:
 *   # 1) dry-run で件数とティア別内訳を確認
 *   pnpm tsx --env-file=.env.local scripts/backfill-job-display-priority.ts
 *
 *   # 2) 実適用（差分のあるレコードのみ UPDATE）
 *   pnpm tsx --env-file=.env.local scripts/backfill-job-display-priority.ts --apply
 *
 * 安全機構:
 *   - dry-run がデフォルト
 *   - 計算済 priority と DB の現在値が同じならスキップ（UPDATE しない）
 *   - 500 件単位のバッチ更新 + 接続断リトライ (P1017 / P2028)
 */

import { prisma } from "@/lib/db"
import { computeDisplayPriority } from "@/lib/job-display-priority"

type Args = { apply: boolean }

function parseArgs(): Args {
  return { apply: process.argv.includes("--apply") }
}

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  const delays = [1_000, 2_000, 5_000, 10_000]
  let lastErr: unknown
  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const code = (e as { code?: string }).code
      const isRetryable =
        code === "P1017" ||
        code === "P2028" ||
        code === "P1001" ||
        (e instanceof Error && /closed the connection/i.test(e.message))
      if (!isRetryable || attempt === delays.length) throw e
      const wait = delays[attempt]
      console.warn(
        `  ⚠️  ${label} で接続エラー (${code ?? "?"}) → ${wait}ms 後にリトライ`
      )
      await new Promise((r) => setTimeout(r, wait))
    }
  }
  throw lastErr
}

async function main(): Promise<void> {
  const args = parseArgs()
  console.info(
    args.apply
      ? "🔴 APPLY MODE: displayPriority を実際に UPDATE します"
      : "🟡 DRY-RUN MODE: 件数とティア内訳を表示するだけ (--apply で実適用)"
  )

  const total = await prisma.job.count()
  console.info(`  全求人数: ${total.toLocaleString()} 件`)

  const fetchBatchSize = 1000
  const writeBatchSize = 100

  let cursor: string | undefined
  let scanned = 0
  let updated = 0
  let unchanged = 0
  const tierDist: Record<string, number> = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 }

  let pendingWrites: Array<{ id: string; priority: number }> = []
  async function flushWrites(): Promise<void> {
    if (!args.apply || pendingWrites.length === 0) return
    const batch = pendingWrites
    pendingWrites = []
    const ops = batch.map((w) =>
      prisma.job.update({
        where: { id: w.id },
        data: { displayPriority: w.priority },
      })
    )
    await withRetry(
      () => prisma.$transaction(ops),
      `flushWrites(${batch.length}件)`
    )
    updated += batch.length
  }

  while (true) {
    const jobs = await withRetry(
      () =>
        prisma.job.findMany({
          orderBy: { id: "asc" },
          take: fetchBatchSize,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            source: true,
            salaryType: true,
            salaryMin: true,
            salaryMax: true,
            employmentType: true,
            workHours: true,
            workHoursNotes: true,
            holidays: true,
            annualHolidays: true,
            insurance: true,
            smokingPolicy: true,
            trialPeriod: true,
            description: true,
            prefecture: true,
            displayPriority: true,
          },
        }),
      "findMany"
    )
    if (jobs.length === 0) break

    for (const job of jobs) {
      scanned++
      const priority = computeDisplayPriority(job)
      tierDist[String(priority)] = (tierDist[String(priority)] ?? 0) + 1

      if (priority === job.displayPriority) {
        unchanged++
        continue
      }

      if (args.apply) {
        pendingWrites.push({ id: job.id, priority })
        if (pendingWrites.length >= writeBatchSize) await flushWrites()
      }
    }

    cursor = jobs[jobs.length - 1].id
    if (scanned % 10000 === 0) {
      console.info(
        `  ... ${scanned.toLocaleString()} 件処理済 (UPDATE 済: ${updated.toLocaleString()})`
      )
    }
  }

  await flushWrites()

  console.info("\n============================================================")
  console.info(`  スキャン総数:      ${scanned.toLocaleString()} 件`)
  console.info(`  ティア計算結果は同値（skip）: ${unchanged.toLocaleString()} 件`)
  if (args.apply) {
    console.info(`  UPDATE 実行:       ${updated.toLocaleString()} 件`)
  } else {
    console.info(`  UPDATE 予定:       ${(scanned - unchanged).toLocaleString()} 件`)
  }
  console.info("============================================================\n")

  console.info("  ティア別 内訳:")
  console.info(
    `    Tier 1 (direct/手入力):           ${tierDist["1"].toLocaleString().padStart(8)} 件`
  )
  console.info(
    `    Tier 2 (monthly + 完全):          ${tierDist["2"].toLocaleString().padStart(8)} 件`
  )
  console.info(
    `    Tier 3 (monthly 不完全):          ${tierDist["3"].toLocaleString().padStart(8)} 件`
  )
  console.info(
    `    Tier 4 (hourly / daily):          ${tierDist["4"].toLocaleString().padStart(8)} 件`
  )
  console.info(
    `    Tier 5 (annual / null / その他):  ${tierDist["5"].toLocaleString().padStart(8)} 件`
  )

  if (!args.apply && scanned - unchanged > 0) {
    console.info(
      `\n⚠️  上記の件数で問題なければ --apply を付けて再実行してください`
    )
  }
}

main()
  .catch((err) => {
    console.error("❌ バックフィル中にエラーが発生しました:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

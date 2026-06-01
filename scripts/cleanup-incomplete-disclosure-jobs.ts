/**
 * scripts/cleanup-incomplete-disclosure-jobs.ts
 *
 * 労働条件明示（労基法第15条 / 職安法第5条の3）の欠損が著しい公開求人を
 * `status='closed'` に更新するワンショット運用スクリプト。
 *
 * 背景:
 *   リリース前のデータ品質改善の一環。寛容判定（テキストフィールドへの
 *   フォールバック込み = 労基法上「文書で明示されているか」の指標）でも
 *   5 項目以上が欠損している求人は、求職者にとって判断材料が不足しており、
 *   募集情報等提供事業者としての表示義務も満たしにくい。これらを公開停止する。
 *
 * 判定ロジックは監査スクリプト (scripts/audit-job-disclosures.ts) と
 * 同じ src/lib/job-disclosure.ts の findMissingLenient() を共有しているため、
 * 監査が出した「欠損 N 件」の分布と本スクリプトの対象がドリフトしない。
 *
 * 削除ではなく close にする理由:
 *   - Application モデル等から FK 参照されている可能性がある
 *   - 監査用に履歴を残す
 *   - 公開側 `/jobs` は status='active' でフィルタするため close で即非表示
 *
 * 安全機構:
 *   - dry-run がデフォルト（--apply で実適用）
 *   - 寛容判定での欠損項目数の分布を全件表示してから件数を確定
 *   - --min-missing=N（デフォルト 5）で閾値を可変
 *   - 100 件単位のバッチ更新 + 接続断リトライ (P1017 / P2028 / P1001)
 *
 * 実行方法:
 *   # 1) dry-run で対象件数・欠損分布・サンプルを確認
 *   pnpm tsx --env-file=.env.local scripts/cleanup-incomplete-disclosure-jobs.ts
 *
 *   # 2) 実適用
 *   pnpm tsx --env-file=.env.local scripts/cleanup-incomplete-disclosure-jobs.ts --apply
 *
 *   # 閾値やソースを変える場合
 *   pnpm tsx --env-file=.env.local scripts/cleanup-incomplete-disclosure-jobs.ts --min-missing=6 --source=hellowork
 */

import { prisma } from "@/lib/db"
import {
  DISCLOSURE_FIELD_LABELS,
  DISCLOSURE_SELECT,
  findMissingLenient,
  type DisclosureFieldKey,
  type DisclosureJob,
} from "@/lib/job-disclosure"

type Args = {
  apply: boolean
  minMissing: number
  source: string | null
  samples: number
}

function parseArgs(): Args {
  const minArg = process.argv.find((a) => a.startsWith("--min-missing="))
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))
  const samplesArg = process.argv.find((a) => a.startsWith("--samples="))
  return {
    apply: process.argv.includes("--apply"),
    minMissing: minArg ? Number(minArg.split("=")[1]) : 5,
    source: sourceArg ? sourceArg.split("=")[1] : null,
    samples: samplesArg ? Number(samplesArg.split("=")[1]) : 10,
  }
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

type JobRow = DisclosureJob & {
  id: string
  title: string
  source: string
}

function pct(part: number, total: number): string {
  if (total === 0) return "0.00%"
  return `${((part / total) * 100).toFixed(2)}%`
}

async function main(): Promise<void> {
  const args = parseArgs()
  if (!Number.isFinite(args.minMissing) || args.minMissing < 1) {
    console.error("❌ --min-missing は 1 以上の整数で指定してください")
    process.exit(1)
  }

  console.info("🧹 労働条件明示 欠損求人 cleanup スクリプト")
  console.info(
    args.apply
      ? "🔴 APPLY MODE: 対象求人を status='closed' に実際に UPDATE します"
      : "🟡 DRY-RUN MODE: 件数・分布・サンプルを表示するだけ (--apply で実適用)"
  )
  console.info(
    `  判定: 寛容判定（findMissingLenient）の欠損項目数 >= ${args.minMissing} を close 対象`
  )
  if (args.source) console.info(`  --source=${args.source}`)

  const where = {
    status: "active",
    ...(args.source ? { source: args.source } : {}),
  }
  const total = await prisma.job.count({ where })
  console.info(
    `  対象母数: status='active'${args.source ? ` source='${args.source}'` : ""} ${total.toLocaleString()} 件\n`
  )

  const fetchBatchSize = 1000
  const writeBatchSize = 100

  let cursor: string | undefined
  let scanned = 0
  let closed = 0
  const missingDist = new Map<number, number>()
  const targetBySource = new Map<string, number>()
  // close 対象における項目別の欠損回数（どの項目が足を引っ張っているか）
  const fieldMissCount: Record<DisclosureFieldKey, number> = {
    employmentType: 0,
    salary: 0,
    workHours: 0,
    holidays: 0,
    insurance: 0,
    smokingPolicy: 0,
    trialPeriod: 0,
    description: 0,
    prefecture: 0,
  }
  const samples: Array<{
    id: string
    title: string
    source: string
    missing: DisclosureFieldKey[]
  }> = []

  let pendingWrites: string[] = []
  async function flushWrites(): Promise<void> {
    if (!args.apply || pendingWrites.length === 0) return
    const batch = pendingWrites
    pendingWrites = []
    await withRetry(
      () =>
        prisma.job.updateMany({
          where: { id: { in: batch } },
          data: { status: "closed" },
        }),
      `flushWrites(${batch.length}件)`
    )
  }

  while (true) {
    const jobs = await withRetry(
      () =>
        prisma.job.findMany({
          where,
          orderBy: { id: "asc" },
          take: fetchBatchSize,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
          select: {
            id: true,
            title: true,
            source: true,
            ...DISCLOSURE_SELECT,
          },
        }) as Promise<JobRow[]>,
      "findMany"
    )
    if (jobs.length === 0) break

    for (const job of jobs) {
      scanned++
      const missing = findMissingLenient(job)
      missingDist.set(missing.length, (missingDist.get(missing.length) ?? 0) + 1)

      if (missing.length >= args.minMissing) {
        closed++
        targetBySource.set(job.source, (targetBySource.get(job.source) ?? 0) + 1)
        for (const k of missing) fieldMissCount[k]++
        if (samples.length < args.samples) {
          samples.push({
            id: job.id,
            title: job.title,
            source: job.source,
            missing,
          })
        }
        if (args.apply) {
          pendingWrites.push(job.id)
          if (pendingWrites.length >= writeBatchSize) await flushWrites()
        }
      }
    }

    cursor = jobs[jobs.length - 1].id
    if (scanned % 10000 === 0) {
      console.info(
        `  ... ${scanned.toLocaleString()} 件スキャン済 (close 対象: ${closed.toLocaleString()})`
      )
    }
  }

  await flushWrites()

  console.info("\n============================================================")
  console.info(`  スキャン総数:   ${scanned.toLocaleString()} 件`)
  console.info(
    `  close 対象 (欠損 >= ${args.minMissing}): ${closed.toLocaleString()} 件 (${pct(closed, scanned)})`
  )
  console.info("============================================================\n")

  console.info("  寛容判定での欠損項目数の分布:")
  const sortedBuckets = Array.from(missingDist.keys()).sort((a, b) => a - b)
  for (const n of sortedBuckets) {
    const c = missingDist.get(n) ?? 0
    const mark = n >= args.minMissing ? "🧹" : n === 0 ? "✅" : "  "
    const label = n === 0 ? "完全 (欠損 0 件)" : `欠損 ${n} 件`
    console.info(
      `    ${mark} ${label.padEnd(18)} ${c.toLocaleString().padStart(8)} 件 (${pct(c, scanned)})`
    )
  }

  if (targetBySource.size > 0) {
    console.info("\n  close 対象の source 別内訳:")
    for (const [src, c] of targetBySource.entries()) {
      console.info(`    ${src.padEnd(15)} ${c.toLocaleString().padStart(8)} 件`)
    }

    console.info("\n  close 対象で欠損していた項目（出現回数）:")
    const sortedFields = (
      Object.keys(fieldMissCount) as DisclosureFieldKey[]
    ).sort((a, b) => fieldMissCount[b] - fieldMissCount[a])
    for (const k of sortedFields) {
      if (fieldMissCount[k] === 0) continue
      console.info(
        `    ${DISCLOSURE_FIELD_LABELS[k].padEnd(8)} (${k.padEnd(15)}) ${fieldMissCount[k].toLocaleString().padStart(8)} 件`
      )
    }
  }

  if (samples.length > 0) {
    console.info(`\n  close 対象サンプル (${samples.length} 件):`)
    for (const s of samples) {
      console.info(
        `    [${s.id}] (${s.source}) ${s.title.slice(0, 50)}${s.title.length > 50 ? "..." : ""}`
      )
      console.info(`        欠損(${s.missing.length}): ${s.missing.join(", ")}`)
    }
  }

  if (!args.apply) {
    if (closed > 0) {
      console.info(
        `\n⚠️  上記 ${closed.toLocaleString()} 件で問題なければ --apply を付けて再実行してください`
      )
    } else {
      console.info("\n✅ close 対象はありませんでした")
    }
  } else {
    console.info(
      `\n✅ ${closed.toLocaleString()} 件を status='closed' に更新しました`
    )
  }
}

main()
  .catch((e) => {
    console.error("❌ cleanup 中にエラーが発生しました:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

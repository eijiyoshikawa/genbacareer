/**
 * scripts/backfill-salary-from-base-salary.ts
 *
 * 既存の hellowork 求人で salaryMin / salaryMax / salaryType が NULL のものについて、
 * baseSalary (khky 由来テキスト) を parseSalaryText でパースし、構造化カラムへ
 * バックフィルする。
 *
 * 背景: 取り込み時に chgnkeitai_kagen 等の構造化タグが空だった求人が大量にあり、
 * 賃金は baseSalary テキストにのみ存在する状態（約 78,944 件）。これを正規化して
 * UI 検索・給与レンジフィルタ・時給/日当の棲み分けを機能させる。
 *
 * 実行方法:
 *   # 1) dry-run で件数とサンプルを確認
 *   pnpm tsx --env-file=.env.local scripts/backfill-salary-from-base-salary.ts
 *
 *   # 2) 実適用
 *   pnpm tsx --env-file=.env.local scripts/backfill-salary-from-base-salary.ts --apply
 *
 *   # サンプル件数を増やす
 *   pnpm tsx --env-file=.env.local scripts/backfill-salary-from-base-salary.ts --samples=20
 *
 * 安全性:
 *   - status='active' のみ対象
 *   - source='hellowork' のみ対象（direct 投稿は手動入力を尊重）
 *   - salaryMin/Max/Type が「すべて NULL」のレコードのみ対象（既存値は上書きしない）
 *   - dry-run がデフォルト。--apply 明示で初めて UPDATE 実行
 */

import { prisma } from "@/lib/db"
import { parseSalaryText } from "@/lib/crawler/salary-parser"

type Args = { apply: boolean; samples: number }

function parseArgs(): Args {
  const samplesArg = process.argv.find((a) => a.startsWith("--samples="))
  return {
    apply: process.argv.includes("--apply"),
    samples: samplesArg ? Number(samplesArg.split("=")[1]) : 10,
  }
}

async function main(): Promise<void> {
  const args = parseArgs()
  console.info(
    args.apply
      ? "🔴 APPLY MODE: salaryMin/Max/Type を実際に UPDATE します"
      : "🟡 DRY-RUN MODE: 件数とサンプルを表示するだけ (--apply で実適用)"
  )

  // 対象: source='hellowork', status='active', salary 全 NULL, baseSalary あり
  const where = {
    source: "hellowork",
    status: "active",
    salaryMin: null,
    salaryMax: null,
    salaryType: null,
    baseSalary: { not: null },
  } as const

  const total = await prisma.job.count({ where })
  console.info(`  対象候補: ${total.toLocaleString()} 件`)

  const batchSize = 1000
  let cursor: string | undefined
  let scanned = 0
  let parsedOk = 0
  let parsedNothing = 0
  let updated = 0
  const typeDist: Record<string, number> = {
    monthly: 0,
    hourly: 0,
    annual: 0,
    daily: 0,
    "(type=null)": 0,
  }
  const samples: Array<{
    id: string
    title: string
    baseSalary: string
    parsed: { type: string | null; min: number | null; max: number | null }
  }> = []

  while (true) {
    const jobs: Array<{
      id: string
      title: string
      baseSalary: string | null
    }> = await prisma.job.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: { id: true, title: true, baseSalary: true },
    })
    if (jobs.length === 0) break

    for (const job of jobs) {
      scanned++
      const parsed = parseSalaryText(job.baseSalary)

      if (parsed.min == null && parsed.max == null && parsed.type == null) {
        parsedNothing++
        continue
      }
      parsedOk++

      const typeKey = parsed.type ?? "(type=null)"
      typeDist[typeKey] = (typeDist[typeKey] ?? 0) + 1

      if (samples.length < args.samples) {
        samples.push({
          id: job.id,
          title: job.title,
          baseSalary: job.baseSalary ?? "",
          parsed,
        })
      }

      if (args.apply) {
        await prisma.job.update({
          where: { id: job.id },
          data: {
            salaryMin: parsed.min,
            salaryMax: parsed.max,
            salaryType: parsed.type,
          },
        })
        updated++
      }
    }

    cursor = jobs[jobs.length - 1].id
    if (scanned % 10000 === 0) {
      console.info(`  ... ${scanned.toLocaleString()} 件処理済`)
    }
  }

  console.info("\n============================================================")
  console.info(`  スキャン総数:       ${scanned.toLocaleString()} 件`)
  console.info(`  パース成功:         ${parsedOk.toLocaleString()} 件`)
  console.info(`  パース不能:         ${parsedNothing.toLocaleString()} 件`)
  if (args.apply) {
    console.info(`  UPDATE 実行:        ${updated.toLocaleString()} 件`)
  }
  console.info("============================================================\n")

  console.info("  salaryType 別 内訳（パース結果）:")
  for (const [t, c] of Object.entries(typeDist)) {
    if (c > 0) console.info(`    ${t.padEnd(15)} ${c.toLocaleString().padStart(8)} 件`)
  }

  if (samples.length > 0) {
    console.info(`\n  サンプル (${samples.length} 件):`)
    for (const s of samples) {
      console.info(`    [${s.id}] ${s.title}`)
      console.info(`      baseSalary: ${s.baseSalary.slice(0, 60)}`)
      console.info(
        `      → type=${s.parsed.type} min=${s.parsed.min} max=${s.parsed.max}`
      )
    }
  }

  if (!args.apply && parsedOk > 0) {
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

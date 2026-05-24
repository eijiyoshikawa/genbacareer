/**
 * scripts/audit-job-disclosures.ts
 *
 * 求人 1 件 1 件が「労働条件の明示義務」を満たしているかを機械的に監査する
 * read-only スクリプト。
 *
 * 法的根拠:
 *  - 労働基準法 第15条（労働条件の明示）
 *  - 職業安定法 第5条の3（募集情報等提供事業者の表示義務）
 *  - 改正健康増進法（受動喫煙対策の明示, 2020年4月施行）
 *
 * 必須チェック項目（リリース前に欠損ゼロを目指す）:
 *  1. employmentType  雇用形態
 *  2. salary*         賃金（min/max いずれか + salaryType, fallback: baseSalary）
 *  3. workHours       労働時間（fallback: workHoursNotes, jobConditionNotes）
 *  4. holidays        休日（annualHolidays / holidaysOther）
 *  5. insurance       社会保険
 *  6. smokingPolicy   受動喫煙対策（健康増進法）
 *  7. trialPeriod     試用期間の有無
 *  8. description     業務内容
 *  9. prefecture      就業場所
 *
 * 厳格判定 と 寛容判定 の両方を出す:
 *  - 厳格: 構造化カラムのみ（UI/検索で使える「正規化済」指標）
 *  - 寛容: テキストフィールドにフォールバック（労基法第15条の「文書明示」指標）
 *  - 厳格 − 寛容 = 取り込み時の正規化で救える件数（Phase 2 の対象）
 *
 * 加えて salaryType (monthly | hourly | daily | annual | null) の内訳と、
 * **時給制 / 日当制** 求人を月給・年俸と切り分けて詳細レポート（賃金レンジ分布・
 * カテゴリ別件数）を出力する。短期/単発系の棲み分けを意識した運用が前提。
 *
 * 実行方法:
 *   pnpm tsx --env-file=.env.local scripts/audit-job-disclosures.ts
 *
 *   # 欠損サンプル件数を増やす
 *   pnpm tsx --env-file=.env.local scripts/audit-job-disclosures.ts --samples=20
 *
 *   # source で絞る
 *   pnpm tsx --env-file=.env.local scripts/audit-job-disclosures.ts --source=hellowork
 */

import { prisma } from "@/lib/db"
import { getCategoryLabel } from "@/lib/categories"

type Args = { samples: number; source: string | null }

function parseArgs(): Args {
  const samplesArg = process.argv.find((a) => a.startsWith("--samples="))
  const sourceArg = process.argv.find((a) => a.startsWith("--source="))
  return {
    samples: samplesArg ? Number(samplesArg.split("=")[1]) : 5,
    source: sourceArg ? sourceArg.split("=")[1] : null,
  }
}

type JobRow = {
  id: string
  title: string
  source: string
  category: string
  prefecture: string
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  baseSalary: string | null
  description: string | null
  workHours: string | null
  workHoursNotes: string | null
  jobConditionNotes: string | null
  holidays: string | null
  holidaysOther: string | null
  annualHolidays: number | null
  insurance: string | null
  smokingPolicy: string | null
  trialPeriod: string | null
}

type FieldKey =
  | "employmentType"
  | "salary"
  | "workHours"
  | "holidays"
  | "insurance"
  | "smokingPolicy"
  | "trialPeriod"
  | "description"
  | "prefecture"

const FIELD_LABELS: Record<FieldKey, string> = {
  employmentType: "雇用形態",
  salary: "賃金",
  workHours: "労働時間",
  holidays: "休日",
  insurance: "社会保険",
  smokingPolicy: "受動喫煙対策",
  trialPeriod: "試用期間",
  description: "業務内容",
  prefecture: "就業場所",
}

function isBlank(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === ""
}

/**
 * 厳格判定: 構造化カラム（salaryMin/Max/salaryType, workHours, holidays 等）
 * のみで欠損を見る。UI で表示・検索に使える「正規化済み」状態を測る指標。
 */
function findMissingStrict(job: JobRow): FieldKey[] {
  const missing: FieldKey[] = []
  if (isBlank(job.employmentType)) missing.push("employmentType")
  const hasSalaryRange = job.salaryMin != null || job.salaryMax != null
  if (!hasSalaryRange || isBlank(job.salaryType)) missing.push("salary")
  if (isBlank(job.workHours) && isBlank(job.workHoursNotes)) {
    missing.push("workHours")
  }
  if (isBlank(job.holidays) && job.annualHolidays == null) {
    missing.push("holidays")
  }
  if (isBlank(job.insurance)) missing.push("insurance")
  if (isBlank(job.smokingPolicy)) missing.push("smokingPolicy")
  if (isBlank(job.trialPeriod)) missing.push("trialPeriod")
  if (isBlank(job.description)) missing.push("description")
  if (isBlank(job.prefecture)) missing.push("prefecture")
  return missing
}

/**
 * 寛容判定: 構造化カラムが欠けていても、ハローワーク由来のテキストフィールド
 * （baseSalary, jobConditionNotes, holidaysOther）に情報があれば「明示済」と
 * みなす。労基法第15条上「文書で明示されているか」を測る指標。
 *
 * 厳格 − 寛容 = 「取り込み時の正規化（Phase 2）で救える件数」
 */
function findMissingLenient(job: JobRow): FieldKey[] {
  const missing: FieldKey[] = []
  if (isBlank(job.employmentType)) missing.push("employmentType")

  // 賃金: 構造化済 OR baseSalary 文字列に値がある
  const hasSalaryRange = job.salaryMin != null || job.salaryMax != null
  const salaryOk =
    (hasSalaryRange && !isBlank(job.salaryType)) || !isBlank(job.baseSalary)
  if (!salaryOk) missing.push("salary")

  // 労働時間: workHours / workHoursNotes / jobConditionNotes のいずれか
  if (
    isBlank(job.workHours) &&
    isBlank(job.workHoursNotes) &&
    isBlank(job.jobConditionNotes)
  ) {
    missing.push("workHours")
  }

  // 休日: holidays / annualHolidays / holidaysOther のいずれか
  if (
    isBlank(job.holidays) &&
    job.annualHolidays == null &&
    isBlank(job.holidaysOther)
  ) {
    missing.push("holidays")
  }

  if (isBlank(job.insurance)) missing.push("insurance")
  if (isBlank(job.smokingPolicy)) missing.push("smokingPolicy")
  if (isBlank(job.trialPeriod)) missing.push("trialPeriod")
  if (isBlank(job.description)) missing.push("description")
  if (isBlank(job.prefecture)) missing.push("prefecture")
  return missing
}

function pct(part: number, total: number): string {
  if (total === 0) return "0.00%"
  return `${((part / total) * 100).toFixed(2)}%`
}

async function auditDisclosures(args: Args): Promise<void> {
  console.info("\n=== [1/2] 労働条件明示 欠損チェック ===")
  const where = {
    status: "active",
    ...(args.source ? { source: args.source } : {}),
  }
  const total = await prisma.job.count({ where })
  console.info(
    `  対象: status='active'${args.source ? ` source='${args.source}'` : ""} ${total.toLocaleString()} 件`
  )

  const emptyFieldCount = (): Record<FieldKey, number> => ({
    employmentType: 0,
    salary: 0,
    workHours: 0,
    holidays: 0,
    insurance: 0,
    smokingPolicy: 0,
    trialPeriod: 0,
    description: 0,
    prefecture: 0,
  })
  const strictMissingCount = emptyFieldCount()
  const lenientMissingCount = emptyFieldCount()
  const strictDist = new Map<number, number>()
  const lenientDist = new Map<number, number>()
  const lenientMissingBySource = new Map<string, number>()
  const sourceTotal = new Map<string, number>()
  const samples: Array<{
    id: string
    title: string
    strict: FieldKey[]
    lenient: FieldKey[]
  }> = []

  const batchSize = 1000
  let cursor: string | undefined
  let scanned = 0
  while (true) {
    const jobs: JobRow[] = await prisma.job.findMany({
      where,
      orderBy: { id: "asc" },
      take: batchSize,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      select: {
        id: true,
        title: true,
        source: true,
        category: true,
        prefecture: true,
        employmentType: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        baseSalary: true,
        description: true,
        workHours: true,
        workHoursNotes: true,
        jobConditionNotes: true,
        holidays: true,
        holidaysOther: true,
        annualHolidays: true,
        insurance: true,
        smokingPolicy: true,
        trialPeriod: true,
      },
    })
    if (jobs.length === 0) break

    for (const job of jobs) {
      scanned++
      sourceTotal.set(job.source, (sourceTotal.get(job.source) ?? 0) + 1)
      const strict = findMissingStrict(job)
      const lenient = findMissingLenient(job)
      for (const k of strict) strictMissingCount[k]++
      for (const k of lenient) lenientMissingCount[k]++
      strictDist.set(strict.length, (strictDist.get(strict.length) ?? 0) + 1)
      lenientDist.set(lenient.length, (lenientDist.get(lenient.length) ?? 0) + 1)
      if (lenient.length > 0) {
        lenientMissingBySource.set(
          job.source,
          (lenientMissingBySource.get(job.source) ?? 0) + 1
        )
        if (samples.length < args.samples) {
          samples.push({ id: job.id, title: job.title, strict, lenient })
        }
      }
    }

    cursor = jobs[jobs.length - 1].id
    if (scanned % 10000 === 0) {
      console.info(`  ... ${scanned.toLocaleString()} 件スキャン済`)
    }
  }

  console.info(`\n  スキャン: ${scanned.toLocaleString()} 件`)

  console.info(
    "\n  必須項目別 欠損率（厳格=構造化カラムのみ / 寛容=テキストフィールドにフォールバック）:"
  )
  const sortedFields = (Object.keys(strictMissingCount) as FieldKey[]).sort(
    (a, b) => strictMissingCount[b] - strictMissingCount[a]
  )
  console.info(
    "    " +
      "項目".padEnd(13) +
      "(field)".padEnd(20) +
      "厳格".padStart(10) +
      "寛容".padStart(13) +
      "  ← フォールバックで救えた数"
  )
  for (const k of sortedFields) {
    const strictN = strictMissingCount[k]
    const lenientN = lenientMissingCount[k]
    const rescued = strictN - lenientN
    const mark =
      lenientN === 0 ? "✅" : lenientN / scanned > 0.1 ? "❌" : "⚠️ "
    const rescuedStr = rescued > 0 ? ` (-${rescued.toLocaleString()})` : ""
    console.info(
      `    ${mark} ${FIELD_LABELS[k].padEnd(8)} (${k.padEnd(15)}) ${strictN.toLocaleString().padStart(8)} → ${lenientN.toLocaleString().padStart(8)} (${pct(lenientN, scanned)})${rescuedStr}`
    )
  }

  console.info("\n  欠損項目数の分布（厳格 / 寛容）:")
  const allBuckets = new Set<number>([...strictDist.keys(), ...lenientDist.keys()])
  const sortedBuckets = Array.from(allBuckets).sort((a, b) => a - b)
  for (const n of sortedBuckets) {
    const strictN = strictDist.get(n) ?? 0
    const lenientN = lenientDist.get(n) ?? 0
    const mark = n === 0 ? "✅" : "  "
    const label = n === 0 ? "完全 (欠損 0 件)" : `欠損 ${n} 件`
    console.info(
      `    ${mark} ${label.padEnd(20)} 厳格 ${strictN.toLocaleString().padStart(8)} (${pct(strictN, scanned)})  /  寛容 ${lenientN.toLocaleString().padStart(8)} (${pct(lenientN, scanned)})`
    )
  }

  console.info("\n  source 別 寛容判定の欠損率:")
  for (const [src, srcTotal] of sourceTotal.entries()) {
    const missing = lenientMissingBySource.get(src) ?? 0
    console.info(
      `    ${src.padEnd(15)} ${missing.toLocaleString().padStart(8)} / ${srcTotal.toLocaleString().padStart(8)} (${pct(missing, srcTotal)})`
    )
  }

  if (samples.length > 0) {
    console.info(`\n  欠損サンプル (${samples.length} 件、寛容判定で欠損ありのもの):`)
    for (const s of samples) {
      console.info(`    [${s.id}] ${s.title}`)
      console.info(`        厳格欠損: ${s.strict.join(", ") || "(なし)"}`)
      console.info(`        寛容欠損: ${s.lenient.join(", ") || "(なし)"}`)
    }
  }

  // Phase 2 への布石: 取り込み時の正規化で救える件数を強調
  const totalStrictMissing = scanned - (strictDist.get(0) ?? 0)
  const totalLenientMissing = scanned - (lenientDist.get(0) ?? 0)
  const rescuableByNormalization = totalStrictMissing - totalLenientMissing
  if (rescuableByNormalization > 0) {
    console.info(
      `\n  💡 取り込み時の正規化（baseSalary→salaryType/Min/Max, jobConditionNotes→workHours など）で`
    )
    console.info(
      `     ${rescuableByNormalization.toLocaleString()} 件 (${pct(rescuableByNormalization, scanned)}) の欠損を解消可能`
    )
  }
}

type RangeBucket = { label: string; min: number; max: number | null }

const HOURLY_RANGES: RangeBucket[] = [
  { label: "  ~ 1,000 円", min: 0, max: 1000 },
  { label: "1,000 ~ 1,500 円", min: 1000, max: 1500 },
  { label: "1,500 ~ 2,000 円", min: 1500, max: 2000 },
  { label: "2,000 ~ 3,000 円", min: 2000, max: 3000 },
  { label: "3,000 円 ~", min: 3000, max: null },
]

const DAILY_RANGES: RangeBucket[] = [
  { label: "  ~  8,000 円", min: 0, max: 8000 },
  { label: " 8,000 ~ 12,000 円", min: 8000, max: 12000 },
  { label: "12,000 ~ 18,000 円", min: 12000, max: 18000 },
  { label: "18,000 ~ 25,000 円", min: 18000, max: 25000 },
  { label: "25,000 円 ~", min: 25000, max: null },
]

async function reportSalaryBucket(
  whereBase: { status: string; source?: string },
  salaryType: "hourly" | "daily",
  labelJp: string,
  unitLabel: string,
  ranges: RangeBucket[]
): Promise<void> {
  const where = { ...whereBase, salaryType }
  const count = await prisma.job.count({ where })
  if (count === 0) {
    console.info(`\n  ${labelJp}求人はありません`)
    return
  }

  console.info(`\n  💰 ${labelJp}求人の詳細 (${count.toLocaleString()} 件):`)

  const agg = await prisma.job.aggregate({
    where,
    _avg: { salaryMin: true, salaryMax: true },
    _min: { salaryMin: true },
    _max: { salaryMax: true },
  })
  console.info(
    `    平均${unitLabel}(下限): ${agg._avg.salaryMin?.toFixed(0) ?? "-"} 円 / 平均${unitLabel}(上限): ${agg._avg.salaryMax?.toFixed(0) ?? "-"} 円`
  )
  console.info(
    `    最低${unitLabel}: ${agg._min.salaryMin ?? "-"} 円 / 最高${unitLabel}: ${agg._max.salaryMax ?? "-"} 円`
  )

  console.info(`\n    ${unitLabel}レンジ別 件数 (salaryMin 基準):`)
  for (const r of ranges) {
    const c = await prisma.job.count({
      where: {
        ...where,
        salaryMin: { gte: r.min, ...(r.max != null ? { lt: r.max } : {}) },
      },
    })
    console.info(
      `      ${r.label.padEnd(20)} ${c.toLocaleString().padStart(8)} 件 (${pct(c, count)})`
    )
  }
  const nullSalaryMin = await prisma.job.count({
    where: { ...where, salaryMin: null },
  })
  if (nullSalaryMin > 0) {
    console.info(
      `      ⚠️  salaryMin=null     ${nullSalaryMin.toLocaleString().padStart(8)} 件 (賃金不明)`
    )
  }

  const byCategory = await prisma.job.groupBy({
    by: ["category"],
    where,
    _count: { _all: true },
    orderBy: { _count: { id: "desc" } },
  })
  console.info("\n    カテゴリ別:")
  for (const g of byCategory) {
    console.info(
      `      ${getCategoryLabel(g.category).padEnd(20)} ${g._count._all.toLocaleString().padStart(8)} 件`
    )
  }
}

async function auditSalaryTypes(source: string | null): Promise<void> {
  console.info(
    "\n=== [2/2] salaryType 別 集計（時給制 / 日当制 の棲み分け） ==="
  )
  const where = {
    status: "active",
    ...(source ? { source } : {}),
  }

  const grouped = await prisma.job.groupBy({
    by: ["salaryType"],
    where,
    _count: { _all: true },
  })
  const totalActive = grouped.reduce((s, g) => s + g._count._all, 0)

  console.info("\n  salaryType 内訳:")
  for (const g of grouped.sort((a, b) => b._count._all - a._count._all)) {
    const label = g.salaryType ?? "null (未設定)"
    const mark = g.salaryType ? "  " : "⚠️ "
    console.info(
      `    ${mark} ${label.padEnd(15)} ${g._count._all.toLocaleString().padStart(8)} 件 (${pct(g._count._all, totalActive)})`
    )
  }

  await reportSalaryBucket(where, "hourly", "時給制", "時給", HOURLY_RANGES)
  await reportSalaryBucket(where, "daily", "日当制", "日当", DAILY_RANGES)
}

async function main(): Promise<void> {
  const args = parseArgs()
  console.info("🔍 労働条件明示 監査スクリプト (read-only)")
  if (args.source) console.info(`  --source=${args.source}`)
  console.info(`  --samples=${args.samples}`)

  await auditDisclosures(args)
  await auditSalaryTypes(args.source)

  console.info("\n✅ 監査完了")
}

main()
  .catch((err) => {
    console.error("❌ 監査中にエラーが発生しました:", err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())

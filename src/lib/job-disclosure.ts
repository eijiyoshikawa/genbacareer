/**
 * src/lib/job-disclosure.ts
 *
 * 求人の「労働条件明示義務」充足度を機械的に判定する共通ヘルパー。
 *
 * 法的根拠:
 *  - 労働基準法 第15条（労働条件の明示）
 *  - 職業安定法 第5条の3（募集情報等提供事業者の表示義務）
 *  - 改正健康増進法（受動喫煙対策の明示, 2020年4月施行）
 *
 * 監査 (scripts/audit-job-disclosures.ts) と cleanup
 * (scripts/cleanup-incomplete-disclosure-jobs.ts) の両方がここを参照し、
 * 「欠損項目数」の定義がドリフトしないようにする。
 *
 * 厳格判定 と 寛容判定 の 2 段:
 *  - 厳格: 構造化カラムのみ（UI / 検索で使える「正規化済」指標）
 *  - 寛容: テキストフィールドにフォールバック（労基法第15条の「文書明示」指標）
 *  - 厳格 − 寛容 = 取り込み時の正規化で救える件数
 */

/** 労働条件明示の必須チェック項目 */
export type DisclosureFieldKey =
  | "employmentType"
  | "salary"
  | "workHours"
  | "holidays"
  | "insurance"
  | "smokingPolicy"
  | "trialPeriod"
  | "description"
  | "prefecture"

export const DISCLOSURE_FIELD_LABELS: Record<DisclosureFieldKey, string> = {
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

/** 欠損判定に必要な Job カラムのサブセット */
export type DisclosureJob = {
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
  prefecture: string
}

/** findMany 用 select 句（DisclosureJob の全カラムを true に） */
export const DISCLOSURE_SELECT = {
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
  prefecture: true,
} as const

export function isBlank(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === ""
}

/**
 * 厳格判定: 構造化カラム（salaryMin/Max/salaryType, workHours, holidays 等）
 * のみで欠損を見る。UI で表示・検索に使える「正規化済み」状態を測る指標。
 */
export function findMissingStrict(job: DisclosureJob): DisclosureFieldKey[] {
  const missing: DisclosureFieldKey[] = []
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
export function findMissingLenient(job: DisclosureJob): DisclosureFieldKey[] {
  const missing: DisclosureFieldKey[] = []
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

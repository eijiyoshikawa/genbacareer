/**
 * 求人一覧の表示順優先度を算出する純関数。
 *
 * `Job.displayPriority` カラムにこの値をセットし、ソート時の主キーとして使う。
 * 数値が小さいほど上位表示。
 *
 * 優先度ティア:
 *   1: source='direct'           自社投稿（手入力）の求人
 *   2: monthly + complete        月給制で必須明示 9 項目すべて埋まる
 *   3: monthly (incomplete)      その他の月給制求人
 *   4: hourly / daily            時給制 or 日給制
 *   5: その他 (年俸 / null 等)   フォールバック
 *
 * 「complete」の判定は労働基準法第15条 / 改正健康増進法に基づく 9 項目すべて。
 * 監査スクリプト (audit-job-disclosures.ts) の findMissingStrict と同じ基準。
 */

export type DisplayPriority = 1 | 2 | 3 | 4 | 5

export type JobForPriority = {
  source: string
  salaryType: string | null
  salaryMin: number | null
  salaryMax: number | null
  employmentType: string | null
  workHours: string | null
  workHoursNotes: string | null
  holidays: string | null
  annualHolidays: number | null
  insurance: string | null
  smokingPolicy: string | null
  trialPeriod: string | null
  description: string | null
  prefecture: string | null
}

function isBlank(v: string | null | undefined): boolean {
  return v === null || v === undefined || v.trim() === ""
}

function isCompleteForDisplay(job: JobForPriority): boolean {
  if (isBlank(job.employmentType)) return false
  const hasSalaryRange = job.salaryMin != null || job.salaryMax != null
  if (!hasSalaryRange || isBlank(job.salaryType)) return false
  if (isBlank(job.workHours) && isBlank(job.workHoursNotes)) return false
  if (isBlank(job.holidays) && job.annualHolidays == null) return false
  if (isBlank(job.insurance)) return false
  if (isBlank(job.smokingPolicy)) return false
  if (isBlank(job.trialPeriod)) return false
  if (isBlank(job.description)) return false
  if (isBlank(job.prefecture)) return false
  return true
}

export function computeDisplayPriority(job: JobForPriority): DisplayPriority {
  if (job.source === "direct") return 1

  if (job.salaryType === "monthly") {
    return isCompleteForDisplay(job) ? 2 : 3
  }

  if (job.salaryType === "hourly" || job.salaryType === "daily") return 4

  return 5
}

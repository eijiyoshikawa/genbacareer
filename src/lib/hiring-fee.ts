/**
 * 成果報酬の料金モデル: 採用者の理論年収 × 35%（1 採用あたり）。
 *
 * 2026-07 のプラン改定で固定額 (¥498,000〜) から年収比率制へ移行した。
 * 金額は求人の給与情報から理論年収を推定して自動計算し、
 * admin が求人ごとに確定額 (Job.hiringFeeAmount) を設定すればそちらを優先する。
 */

/** 成果報酬率 — 採用者の理論年収に対する割合 */
export const HIRING_FEE_RATE = 0.35

/** 表示用: "35%" */
export const HIRING_FEE_RATE_LABEL = `${Math.round(HIRING_FEE_RATE * 100)}%`

/**
 * 求人に給与情報が一切無い場合の暫定額（旧固定モデルの最低額を踏襲）。
 * この額で請求する前に、admin 画面で理論年収に基づく確定額の設定を推奨。
 */
export const HIRING_FEE_FALLBACK = 498_000

/** 時給から年収を推定する際の想定稼働: 1 日 8h × 月 21 日 × 12 ヶ月 */
const HOURLY_TO_ANNUAL = 8 * 21 * 12

type SalaryFields = {
  salaryMin?: number | null
  salaryMax?: number | null
  salaryType?: string | null
}

/**
 * 求人の給与情報から理論年収（円）を推定する。
 * 下限 (salaryMin) を基準にし、無ければ上限 (salaryMax) を使う。
 * 給与情報が無い場合は null。
 */
export function estimateAnnualIncome(job: SalaryFields): number | null {
  const base = job.salaryMin ?? job.salaryMax
  if (base == null || base <= 0) return null
  switch (job.salaryType) {
    case "annual":
      return base
    case "hourly":
      return base * HOURLY_TO_ANNUAL
    case "monthly":
    default:
      // salaryType 不明時は月給とみなす（サイト内の既定給与形態）
      return base * 12
  }
}

/**
 * 求人ごとの成果報酬額を解決する。
 *
 * 優先順位:
 *   1. Job.hiringFeeAmount — admin が設定した確定額（実際の想定年収 × 35% 等）
 *   2. 求人の給与情報から: 理論年収 × HIRING_FEE_RATE（千円単位に丸め）
 *   3. HIRING_FEE_FALLBACK — 給与情報なしの暫定額
 *
 * 利用箇所:
 *   - lib/billing.ts: 採用確定時の実請求額
 *   - /company/jobs/[id]/performance: 推定 CPA 計算
 *   - /company/billing: 表示用（求人別の単価リスト）
 */
export function resolveHiringFee(
  job: ({ hiringFeeAmount?: number | null } & SalaryFields) | null | undefined,
): number {
  if (job?.hiringFeeAmount != null) return job.hiringFeeAmount
  const annual = job ? estimateAnnualIncome(job) : null
  if (annual == null) return HIRING_FEE_FALLBACK
  const computed = Math.round((annual * HIRING_FEE_RATE) / 1000) * 1000
  // 給与情報の入力ミス（例: 時給欄に月給額を誤入力）で理論年収が極端な値になっても、
  // 実請求額が許容レンジを外れないようクランプする。
  return Math.min(Math.max(computed, HIRING_FEE_MIN), HIRING_FEE_MAX)
}

/**
 * admin が設定できる確定額の範囲。Zod / フォーム / DB CHECK 制約と揃える。
 * 年収比率制への移行に伴い、下限を緩和・上限を拡大
 * （例: 年収 300 万 × 35% = 105 万、年収 1,000 万 × 35% = 350 万）。
 */
export const HIRING_FEE_MIN = 100_000
export const HIRING_FEE_MAX = 5_000_000

/** 入力値が許容レンジに収まっているか */
export function isValidHiringFee(amount: number): boolean {
  return (
    Number.isInteger(amount) &&
    amount >= HIRING_FEE_MIN &&
    amount <= HIRING_FEE_MAX
  )
}

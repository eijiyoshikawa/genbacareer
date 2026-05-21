import { HIRING_FEE_AMOUNT } from "./stripe"

/**
 * 求人ごとの成果報酬単価を解決する。
 *
 * - Job.hiringFeeAmount が設定されていればそれを使う（admin が個別設定）
 * - 未設定（NULL）なら HIRING_FEE_AMOUNT 定数（498,000）にフォールバック
 *
 * 利用箇所:
 *   - lib/billing.ts: 採用確定時の実請求額
 *   - /company/jobs/[id]/performance: 推定 CPA 計算
 *   - /company/billing: 表示用（求人別の単価リスト）
 */
export function resolveHiringFee(
  job: { hiringFeeAmount?: number | null } | null | undefined,
): number {
  return job?.hiringFeeAmount ?? HIRING_FEE_AMOUNT
}

/** 設定可能な金額範囲。Zod / フォーム / DB CHECK 制約と揃える。 */
export const HIRING_FEE_MIN = 200_000
export const HIRING_FEE_MAX = 2_000_000

/** 入力値が許容レンジに収まっているか */
export function isValidHiringFee(amount: number): boolean {
  return (
    Number.isInteger(amount) &&
    amount >= HIRING_FEE_MIN &&
    amount <= HIRING_FEE_MAX
  )
}

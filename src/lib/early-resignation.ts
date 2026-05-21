/**
 * C3 早期退職 / 戻入処理のドメインロジック。
 *
 * 採用後 3 ヶ月以内に求職者が退職した場合の返金率テーブル:
 *   入社 1 ヶ月以内 (0 < n <= 1): 80%
 *   入社 2 ヶ月以内 (1 < n <= 2): 50%
 *   入社 3 ヶ月以内 (2 < n <= 3): 20%
 *   入社 4 ヶ月以降 (3 < n):       0% (対象外)
 *
 * 「ヶ月以内」の判定は入社日から退職日までの経過日数を 30 日で割り、
 * 切り上げ (ceil) で月数を出す。例:
 *   入社 2026-01-01 → 退職 2026-01-15 = 14 日 = 0.46 ヶ月 → 切り上げで 1 → 80%
 *   入社 2026-01-01 → 退職 2026-01-31 = 30 日 = 1.0 ヶ月 → 1 → 80%
 *   入社 2026-01-01 → 退職 2026-02-15 = 45 日 = 1.5 ヶ月 → 切り上げで 2 → 50%
 *   入社 2026-01-01 → 退職 2026-04-01 = 90 日 = 3.0 ヶ月 → 3 → 20%
 *   入社 2026-01-01 → 退職 2026-04-02 = 91 日 → 切り上げで 4 → 0%
 */

/** 1 ヶ月 = 30 日として概算 (月末ズレを許容する運用上の単純化) */
const MONTH_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

/** 返金率の段階定義 (months_after_hire → refund_rate %) */
export const REFUND_RATE_SCHEDULE: ReadonlyArray<{
  monthsAfterHire: number
  refundRate: number
}> = [
  { monthsAfterHire: 1, refundRate: 80 },
  { monthsAfterHire: 2, refundRate: 50 },
  { monthsAfterHire: 3, refundRate: 20 },
] as const

/**
 * 入社日から退職日までの経過月数を算出する。
 * 端数は切り上げ (Math.ceil) で月単位に丸める。最低 1 ヶ月。
 */
export function calculateMonthsAfterHire(
  hiredAt: Date,
  resignedAt: Date,
): number {
  const diffMs = resignedAt.getTime() - hiredAt.getTime()
  if (diffMs <= 0) return 0
  const days = diffMs / DAY_MS
  const months = days / MONTH_DAYS
  return Math.max(1, Math.ceil(months))
}

/**
 * 経過月数 → 返金率 (%) のマッピング。
 * 1 ヶ月以内: 80 / 2 ヶ月以内: 50 / 3 ヶ月以内: 20 / それ以降: 0
 */
export function refundRateForMonths(monthsAfterHire: number): number {
  if (monthsAfterHire <= 1) return 80
  if (monthsAfterHire <= 2) return 50
  if (monthsAfterHire <= 3) return 20
  return 0
}

/**
 * 元の成果報酬額と経過月数から返金額 (JPY) を計算する。
 * 1 円未満は切り捨て。
 */
export function calculateRefundAmount(args: {
  originalFeeAmount: number
  monthsAfterHire: number
}): number {
  const rate = refundRateForMonths(args.monthsAfterHire)
  return Math.floor((args.originalFeeAmount * rate) / 100)
}

/**
 * 申請可能か (= 返金対象期間内か) を判定。
 * 4 ヶ月目以降は対象外。
 */
export function isEligibleForRefund(monthsAfterHire: number): boolean {
  return refundRateForMonths(monthsAfterHire) > 0
}

/**
 * 入社日 + 退職日から、申請に必要な全パラメータを一括計算するヘルパ。
 */
export function computeRefundParams(args: {
  hiredAt: Date
  resignedAt: Date
  originalFeeAmount: number
}): {
  monthsAfterHire: number
  refundRate: number
  refundAmount: number
  eligible: boolean
} {
  const monthsAfterHire = calculateMonthsAfterHire(args.hiredAt, args.resignedAt)
  const refundRate = refundRateForMonths(monthsAfterHire)
  const refundAmount = Math.floor((args.originalFeeAmount * refundRate) / 100)
  return {
    monthsAfterHire,
    refundRate,
    refundAmount,
    eligible: refundRate > 0,
  }
}

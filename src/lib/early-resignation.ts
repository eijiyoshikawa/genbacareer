/**
 * C3 早期退職 / 戻入処理のドメインロジック。
 *
 * 採用後 3 ヶ月以内に求職者が退職した場合の返金率テーブル:
 *   入社 1 ヶ月以内 (0 < n <= 1): 80%
 *   入社 2 ヶ月以内 (1 < n <= 2): 50%
 *   入社 3 ヶ月以内 (2 < n <= 3): 20%
 *   入社 4 ヶ月以降 (3 < n):       0% (対象外)
 *
 * 「ヶ月以内」の判定は実カレンダー月で行う（入社日 + N ヶ月 の応当日と比較）。
 * 月末クランプ（例: 1/31 + 1 ヶ月 → 2/28）にも対応する。
 * 例:
 *   入社 2026-01-01 → 退職 2026-01-15 → +1ヶ月(02-01) 以内 → 1 → 80%
 *   入社 2026-01-01 → 退職 2026-02-01 → +1ヶ月(02-01) 以内 → 1 → 80%
 *   入社 2026-01-01 → 退職 2026-02-15 → +2ヶ月(03-01) 以内 → 2 → 50%
 *   入社 2026-01-01 → 退職 2026-04-01 → +3ヶ月(04-01) 以内 → 3 → 20%
 *   入社 2026-01-01 → 退職 2026-04-02 → +3ヶ月(04-01) 超過 → 4 → 0%
 *
 * ※ 固定 30 日換算 (days / 30) は暦月の日数差 (28〜31 日) を考慮しないため、
 *   31 日ある月をまたぐと本来より厳しい (低い) 返金率に丸められてしまう
 *   バグがあった。実カレンダー月の応当日比較に修正済み。
 */

/** 返金率の段階定義 (months_after_hire → refund_rate %) */
export const REFUND_RATE_SCHEDULE: ReadonlyArray<{
  monthsAfterHire: number
  refundRate: number
}> = [
  { monthsAfterHire: 1, refundRate: 80 },
  { monthsAfterHire: 2, refundRate: 50 },
  { monthsAfterHire: 3, refundRate: 20 },
] as const

/** UTC 基準で date に months ヶ月を加算する。月末は当該月の末日にクランプする。 */
function addCalendarMonthsUTC(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth()
  const day = date.getUTCDate()
  const targetMonthIndex = month + months
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDayOfTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate()
  const clampedDay = Math.min(day, lastDayOfTargetMonth)
  return new Date(
    Date.UTC(
      targetYear,
      targetMonth,
      clampedDay,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )
}

/**
 * 入社日から退職日までの経過月数を実カレンダー月で算出する。
 * 「入社日 + N ヶ月」の応当日以下なら N ヶ月以内、として最小の N (1〜3) を返す。
 * それを超える場合は 4 を返す（= 対象外）。退職日が入社日以前なら 0。
 */
export function calculateMonthsAfterHire(
  hiredAt: Date,
  resignedAt: Date,
): number {
  if (resignedAt.getTime() <= hiredAt.getTime()) return 0
  for (let n = 1; n <= 3; n++) {
    if (resignedAt.getTime() <= addCalendarMonthsUTC(hiredAt, n).getTime()) {
      return n
    }
  }
  return 4
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

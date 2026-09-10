/**
 * C3 早期退職 / 戻入処理のドメインロジック。
 *
 * 採用後 3 ヶ月以内に求職者が退職した場合の返金率テーブル:
 *   入社 1 ヶ月以内 (0 < n <= 1): 80%
 *   入社 2 ヶ月以内 (1 < n <= 2): 50%
 *   入社 3 ヶ月以内 (2 < n <= 3): 20%
 *   入社 4 ヶ月以降 (3 < n):       0% (対象外)
 *
 * 「ヶ月以内」の判定はカレンダー月単位で行う（暦上の「入社日 + N ヶ月」の
 * 応当日以前に退職したら N ヶ月以内、とみなす）。例:
 *   入社 2026-01-01 → 退職 2026-01-15 → 1 ヶ月以内 (+1ヶ月=2026-02-01 以前) → 80%
 *   入社 2026-01-01 → 退職 2026-02-01 → 1 ヶ月以内 (ちょうど応当日) → 80%
 *   入社 2026-01-01 → 退職 2026-02-15 → 2 ヶ月以内 (+2ヶ月=2026-03-01 以前) → 50%
 *   入社 2026-01-01 → 退職 2026-04-01 → 3 ヶ月以内 (ちょうど応当日) → 20%
 *   入社 2026-01-01 → 退職 2026-04-02 → 3 ヶ月超 → 0%
 *
 * 以前は「経過日数 ÷ 30 を切り上げ」という概算式を使っており、31 日ある月
 * (1・3・5・7・8・10・12月) や閏年の 2 月を挟むと、暦上はちょうど N ヶ月の
 * 退職でも日数ベースでは N+1 ヶ月分に切り上がってしまい、本来受け取れる
 * はずの返金率が 1 段階下がる（20% → 0% 等）バグがあった。時刻部分の
 * 揺れ（hiredAt は打刻時刻付き、resignedAt は日付のみのことが多い）が
 * 境界判定をさらに不安定にしないよう、日付部分だけを比較する。
 */

/**
 * UTC の年月日部分だけを取り出した Date（時刻は 00:00:00 UTC）。
 * hiredAt (打刻時刻付き) と resignedAt (日付のみのことが多い) の時刻差が
 * 月境界の判定をぶれさせないようにする。
 */
function toUtcDateOnly(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

/** 指定日にカレンダー月を n ヶ月加算した日付を返す（UTC 基準）。 */
function addUtcMonths(d: Date, n: number): Date {
  const result = new Date(d)
  result.setUTCMonth(result.getUTCMonth() + n)
  return result
}

/** 返金率の段階定義 (months_after_hire → refund_rate %) */
export const REFUND_RATE_SCHEDULE: ReadonlyArray<{
  monthsAfterHire: number
  refundRate: number
}> = [
  { monthsAfterHire: 1, refundRate: 80 },
  { monthsAfterHire: 2, refundRate: 50 },
  { monthsAfterHire: 3, refundRate: 20 },
] as const

/** 返金対象期間 (4 ヶ月目以降は対象外) を判定する上限の探索幅 */
const MAX_MONTHS_CHECKED = REFUND_RATE_SCHEDULE.length + 1

/**
 * 入社日から退職日までの経過月数（カレンダー月ベース）を算出する。
 * 「入社日 + N ヶ月」の応当日以前に退職していれば N ヶ月以内とみなす。
 */
export function calculateMonthsAfterHire(
  hiredAt: Date,
  resignedAt: Date,
): number {
  const hired = toUtcDateOnly(hiredAt)
  const resigned = toUtcDateOnly(resignedAt)
  if (resigned.getTime() <= hired.getTime()) return 0

  for (let n = 1; n <= MAX_MONTHS_CHECKED; n++) {
    if (resigned.getTime() <= addUtcMonths(hired, n).getTime()) {
      return n
    }
  }
  return MAX_MONTHS_CHECKED + 1
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

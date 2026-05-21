/**
 * 採用ボーナス (C5) のドメインヘルパ。
 *
 * 求職者が採用後一定期間勤続したら受け取れる祝い金。
 * 2026-05 のビジネスモデル変更により金額は ¥50,000 固定 (admin で個別変更可)、
 * 適用は月額プラン / SNS 枠の企業からの採用に限定。
 */

import { isPlanEligibleForBonus } from "@/lib/plans"

/** 採用ボーナス標準額 (admin が個別変更しなければこの値が使われる) */
export const HIRING_BONUS_AMOUNT = 50_000

/**
 * 採用ボーナス申請可否を判定する。
 *
 * 申請可能条件:
 *   1. 採用済み (Application.status = 'hired')
 *   2. 採用元企業のプランが対象 (monthly_12 / monthly_24 / sns_client)
 *
 * 注意: 勤続期間チェック (例: 入社後 1 ヶ月経過必須等) は別途上位で行う。
 *      本関数はプラン適格性のみ判定。
 */
export function isHiringBonusEligible(args: {
  applicationStatus: string
  companyPlanType: string | null | undefined
}): boolean {
  if (args.applicationStatus !== "hired") return false
  return isPlanEligibleForBonus(args.companyPlanType)
}

/**
 * 採用ボーナス金額の解決。
 * 既存のレコードがあればその amount、無ければ標準額。
 */
export function resolveHiringBonusAmount(
  existing: { amount: number } | null | undefined,
): number {
  return existing?.amount ?? HIRING_BONUS_AMOUNT
}

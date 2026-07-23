/**
 * 掲載プラン (C2-C8) のドメインロジック。
 *
 * Company.planType で表現される 5 つのプラン状態を一元的に扱う。
 * 各プランの: 課金モデル / 期限管理 / 採用ボーナス可否 / スカウト可否 /
 * 求人一覧の上位表示優先度 をここに集約する。
 */

/** プラン種別 (Company.planType の取りうる値) */
export const PLAN_TYPES = [
  "success_fee", // ① 成果報酬 年収35%
  "monthly_12", // ② 月額 12 ヶ月一括
  "monthly_24", // ③ 月額 24 ヶ月一括
  "campaign_free", // キャンペーン枠 ¥0 無期限
  "sns_client", // サクバズ SNS クライアント
] as const

export type PlanType = (typeof PLAN_TYPES)[number]

/** 表示ラベル (管理画面 / 企業ダッシュボード共通) */
export const PLAN_LABELS: Record<PlanType, string> = {
  success_fee: "成果報酬プラン (年収35% / 採用 1 件)",
  monthly_12: "月額プラン 12 ヶ月一括前払い",
  monthly_24: "月額プラン 24 ヶ月一括前払い",
  campaign_free: "キャンペーン枠 (¥0 無期限)",
  sns_client: "サクバズ SNS クライアント枠",
}

/** 短縮ラベル (バッジ表示等で使う) */
export const PLAN_SHORT_LABELS: Record<PlanType, string> = {
  success_fee: "成果報酬",
  monthly_12: "月額 12 ヶ月",
  monthly_24: "月額 24 ヶ月",
  campaign_free: "キャンペーン",
  sns_client: "SNS 連携",
}

/** 入力文字列が PlanType として有効かを判定 */
export function isPlanType(s: string): s is PlanType {
  return (PLAN_TYPES as readonly string[]).includes(s)
}

/**
 * 求人一覧の上位表示優先度 (Company.planTier として永続化される値)。
 *
 *   3: paid 平等枠 (① success_fee / ② monthly_12 / ③ monthly_24)
 *   2: SNS 枠 (sns_client)
 *   1: キャンペーン枠 (campaign_free)
 *   0: それ以外 (HelloWork 取り込み企業 等、参照データなので最下位)
 *
 * RELEASE_TODO C8 の優先順位仕様に対応:
 *   "1. 有償平等枠 (① / ② / ③) → ランダム or 公平
 *    2. SNS 枠 (sns_client)
 *    3. キャンペーン枠 (campaign_free)"
 */
export function planTier(args: {
  planType: string | null | undefined
  source?: string | null | undefined
}): number {
  // HelloWork 取り込みは参照データ。直接掲載企業より下位に固定。
  if (args.source === "hellowork") return 0

  switch (args.planType) {
    case "success_fee":
    case "monthly_12":
    case "monthly_24":
      return 3
    case "sns_client":
      return 2
    case "campaign_free":
      return 1
    default:
      return 0
  }
}

/** 有償プランか (採用が発生したら課金される / 月額を払っている) */
export function isPaidPlan(planType: string | null | undefined): boolean {
  return (
    planType === "success_fee" ||
    planType === "monthly_12" ||
    planType === "monthly_24"
  )
}

/** 月額契約プランか (planPaidUntil による期限管理が必要) */
export function isMonthlyPlan(planType: string | null | undefined): boolean {
  return planType === "monthly_12" || planType === "monthly_24"
}

/**
 * 採用ボーナス (¥50,000) の対象プランか (C5)。
 *
 * 成果報酬とキャンペーン枠では、企業から運営への対価が「採用発生時のみ」
 * または「無料」であるため、別途求職者向けボーナスは企業が負担する
 * ビジネスモデル上採算が合わない → 月額プラン と SNS 枠 のみで提供。
 */
export function isPlanEligibleForBonus(
  planType: string | null | undefined,
): boolean {
  return (
    planType === "monthly_12" ||
    planType === "monthly_24" ||
    planType === "sns_client"
  )
}

/**
 * スカウト送信可能なプランか。
 *
 * 成果報酬・月額・SNS 枠 は OK、キャンペーン枠は不可 (¥0 無期限掲載なので
 * スカウト送信のような積極的アクションは別オプション扱い)。
 */
export function canSendScoutByPlan(
  planType: string | null | undefined,
): boolean {
  return (
    planType === "success_fee" ||
    planType === "monthly_12" ||
    planType === "monthly_24" ||
    planType === "sns_client"
  )
}

/**
 * プランがアクティブか (期限切れしていないか)。
 *
 * success_fee / campaign_free は期限なし → 常にアクティブ。
 * monthly_12 / monthly_24 / sns_client は planPaidUntil が未来であればアクティブ。
 */
export function isPlanActive(args: {
  planType: string | null | undefined
  planPaidUntil: Date | null | undefined
  now?: Date
}): boolean {
  const { planType, planPaidUntil } = args
  const now = args.now ?? new Date()
  if (planType === "success_fee" || planType === "campaign_free") return true
  if (planType === "monthly_12" || planType === "monthly_24" || planType === "sns_client") {
    if (!planPaidUntil) return false
    return planPaidUntil.getTime() > now.getTime()
  }
  return false
}

/** プランの満了日まで残り日数 (期限なしプランは null) */
export function daysUntilPlanExpiry(
  paidUntil: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!paidUntil) return null
  const diffMs = paidUntil.getTime() - now.getTime()
  return Math.ceil(diffMs / (24 * 60 * 60 * 1000))
}

/** 期限まで 30 日以内か (期限なしは false) */
export function isPlanExpiringSoon(
  paidUntil: Date | null | undefined,
  threshold = 30,
  now: Date = new Date(),
): boolean {
  const remaining = daysUntilPlanExpiry(paidUntil, now)
  if (remaining === null) return false
  return remaining > 0 && remaining <= threshold
}

/**
 * 求人投稿可否を判定する。
 * - status='approved' (企業承認済) 必須
 * - プラン active (期限切れ月額プランは不可) 必須
 */
export function canPostJob(args: {
  status: string
  planType: string | null | undefined
  planPaidUntil: Date | null | undefined
  now?: Date
}): boolean {
  if (args.status !== "approved") return false
  return isPlanActive({
    planType: args.planType,
    planPaidUntil: args.planPaidUntil,
    now: args.now,
  })
}

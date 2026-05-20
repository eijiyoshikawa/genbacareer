/**
 * 通報理由の定数定義 (6.2)。
 * フォーム表示順 = 配列順、API バリデーションも値で行う。
 */

export const REPORT_REASONS = [
  { value: "guideline_violation", label: "規約・ガイドライン違反" },
  { value: "false_information", label: "虚偽の情報・誇大表示" },
  { value: "inappropriate", label: "不適切な表現・差別的内容" },
  { value: "personal_info", label: "個人情報の不適切な掲載" },
  { value: "spam", label: "スパム・無関係な投稿" },
  { value: "other", label: "その他" },
] as const

export type ReportReasonValue = (typeof REPORT_REASONS)[number]["value"]

export const REPORT_TARGET_TYPES = ["job", "company", "user", "review"] as const
export type ReportTargetType = (typeof REPORT_TARGET_TYPES)[number]

export function isValidReportReason(value: string): value is ReportReasonValue {
  return REPORT_REASONS.some((r) => r.value === value)
}

export function isValidReportTargetType(value: string): value is ReportTargetType {
  return (REPORT_TARGET_TYPES as readonly string[]).includes(value)
}

export function getReportReasonLabel(value: string): string {
  return REPORT_REASONS.find((r) => r.value === value)?.label ?? value
}

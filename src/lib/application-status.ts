/**
 * Application.status の遷移ルール。
 *
 * 単体更新 (`/api/company/applications/[id]`) と一括更新
 * (`/api/company/applications/bulk`) の両方で同じルールを使うことで、
 * 一括更新側だけ終端ステータス (hired/rejected) からの巻き戻しや
 * 不正な飛び越し遷移が可能になってしまう抜け穴を防ぐ。
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

export function canTransitionStatus(from: string, to: string): boolean {
  return VALID_STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

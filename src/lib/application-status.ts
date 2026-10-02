/**
 * 応募ステータスの状態遷移ルール。
 * 単体更新 (/api/company/applications/[id]) と一括更新
 * (/api/company/applications/bulk) の両方で共有する。
 */
export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

export function isValidStatusTransition(from: string, to: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[from]
  return !!allowed && allowed.includes(to)
}

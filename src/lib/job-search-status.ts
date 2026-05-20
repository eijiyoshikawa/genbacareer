/**
 * 求職者の求職ステータス（2.6）。
 * 既存の `User.status` (active/suspended/deleted) は管理用なので別カラム。
 */

export const JOB_SEARCH_STATUSES = [
  {
    value: "searching",
    label: "求職中",
    description: "積極的に転職活動中。新着求人通知や応募を最大限受け取ります。",
  },
  {
    value: "employed_open",
    label: "在職中（情報収集）",
    description: "今は退職予定なし。良い求人があれば検討したい。",
  },
  {
    value: "hired",
    label: "採用が決まりました",
    description: "通知を一時停止します。新たに探し始める場合は変更してください。",
  },
] as const

export type JobSearchStatusValue = (typeof JOB_SEARCH_STATUSES)[number]["value"]

export function isValidJobSearchStatus(value: string): value is JobSearchStatusValue {
  return JOB_SEARCH_STATUSES.some((s) => s.value === value)
}

export function getJobSearchStatusLabel(value: string): string {
  return JOB_SEARCH_STATUSES.find((s) => s.value === value)?.label ?? value
}

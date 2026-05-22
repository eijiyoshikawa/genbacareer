/**
 * LINE Lead のステータス定義 + UI 用ラベル / 色マップ。
 * line_leads.status カラムは VARCHAR(20)、Zod でこの enum に制約する。
 */

export const LEAD_STATUSES = [
  "pending",
  "line_added",
  "contacted",
  "qualified",
  "converted",
  "rejected",
] as const

export type LeadStatus = (typeof LEAD_STATUSES)[number]

export const LEAD_STATUS_META: Record<
  LeadStatus,
  { label: string; description: string; classes: string }
> = {
  pending: {
    label: "新規",
    description: "フォーム送信直後、未対応",
    classes: "bg-amber-100 text-amber-800 border-amber-200",
  },
  line_added: {
    label: "LINE 追加済",
    description: "公式 LINE を友だち追加済み",
    classes: "bg-sky-100 text-sky-800 border-sky-200",
  },
  contacted: {
    label: "連絡済",
    description: "担当者からファーストコンタクト完了",
    classes: "bg-blue-100 text-blue-800 border-blue-200",
  },
  qualified: {
    label: "見込み高",
    description: "ヒアリング済、適合度が高い",
    classes: "bg-emerald-100 text-emerald-800 border-emerald-200",
  },
  converted: {
    label: "成約",
    description: "採用 / 面接成立",
    classes: "bg-green-200 text-green-900 border-green-400",
  },
  rejected: {
    label: "不成立",
    description: "適合せず / 連絡不通",
    classes: "bg-gray-200 text-gray-700 border-gray-300",
  },
}

export function isLeadStatus(value: unknown): value is LeadStatus {
  return typeof value === "string" && (LEAD_STATUSES as readonly string[]).includes(value)
}

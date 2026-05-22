import { TagChip } from "./tag-chip"
import {
  type TagGroup,
  TAG_GROUP_LABELS,
} from "@/lib/job-enrichment"

/**
 * 求人詳細の「この求人の特徴」ブロック。
 * 雇用形態 / グループ別タグを 1 行ずつ縦に並べる表形式 UI。
 *
 * 何も埋まらない（タグも雇用形態もない）場合は null を返してセクション自体非表示。
 */
export function JobInfoTable({
  employmentType,
  tagGroups,
}: {
  employmentType: string | null
  tagGroups: Record<TagGroup, string[]>
}) {
  const rows: Array<{ label: string; chips: { text: string; tone?: "primary" | "muted" }[] }> = []

  if (employmentType) {
    rows.push({
      label: "雇用形態",
      chips: [{ text: employmentTypeLabel(employmentType), tone: "primary" }],
    })
  }
  for (const key of ["wage", "benefits", "experience", "time"] as TagGroup[]) {
    const tags = tagGroups[key]
    if (!tags || tags.length === 0) continue
    rows.push({
      label: TAG_GROUP_LABELS[key],
      chips: tags.map((t) => ({ text: t, tone: "primary" as const })),
    })
  }

  if (rows.length === 0) return null

  return (
    <div className="border bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-block h-5 w-1 bg-primary-500" />
        <h2 className="text-base sm:text-lg font-bold text-gray-900">
          この求人の特徴
        </h2>
      </div>
      <dl className="divide-y divide-gray-100">
        {rows.map((row) => (
          <div
            key={row.label}
            className="grid grid-cols-[7rem_1fr] sm:grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0"
          >
            <dt className="text-sm font-medium text-gray-600 pt-1">
              {row.label}
            </dt>
            <dd className="flex flex-wrap gap-1.5">
              {row.chips.map((c) => (
                <TagChip key={c.text} tone={c.tone}>
                  {c.text}
                </TagChip>
              ))}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function employmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return labels[type] ?? type
}

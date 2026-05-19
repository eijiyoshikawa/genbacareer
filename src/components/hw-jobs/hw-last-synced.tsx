import { Clock } from "lucide-react"
import { formatLastSynced } from "@/lib/jobs-api/format"

export function HwLastSynced({ isoDatetime }: { isoDatetime: string | null | undefined }) {
  const formatted = formatLastSynced(isoDatetime)
  if (!formatted) return null
  return (
    <p className="mt-6 flex items-center gap-1 text-xs text-gray-500">
      <Clock className="h-3 w-3" />
      公共求人の最終同期: {formatted}
      <span className="text-gray-400">
        （公共職業安定所の公開情報より転載・原文ママ）
      </span>
    </p>
  )
}

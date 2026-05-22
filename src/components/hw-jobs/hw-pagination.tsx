import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface HwPaginationProps {
  basePath: string
  baseQuery: Record<string, string | undefined>
  offset: number
  limit: number
  total: number
}

export function HwPagination({ basePath, baseQuery, offset, limit, total }: HwPaginationProps) {
  if (total <= limit) return null
  const currentPage = Math.floor(offset / limit) + 1
  const totalPages = Math.ceil(total / limit)
  const prevOffset = Math.max(0, offset - limit)
  const nextOffset = offset + limit

  const buildHref = (newOffset: number) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(baseQuery)) {
      if (v) sp.set(k, v)
    }
    if (newOffset > 0) sp.set("offset", String(newOffset))
    sp.set("limit", String(limit))
    const qs = sp.toString()
    return qs ? `${basePath}?${qs}` : basePath
  }

  const hasPrev = offset > 0
  const hasNext = offset + limit < total

  return (
    <nav className="mt-6 flex items-center justify-between text-sm">
      {hasPrev ? (
        <Link
          href={buildHref(prevOffset)}
          className="inline-flex items-center gap-1 border border-primary-500 bg-white px-4 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-50 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          前へ
        </Link>
      ) : (
        <span className="invisible">前へ</span>
      )}

      <span className="text-gray-500">
        {currentPage} / {totalPages} ページ（全 {total.toLocaleString()} 件）
      </span>

      {hasNext ? (
        <Link
          href={buildHref(nextOffset)}
          className="inline-flex items-center gap-1 border border-primary-500 bg-white px-4 py-1.5 text-xs font-bold text-primary-600 hover:bg-primary-50 transition"
        >
          次へ
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : (
        <span className="invisible">次へ</span>
      )}
    </nav>
  )
}

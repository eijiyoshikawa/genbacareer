import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

interface PaginationProps {
  currentPage: number
  totalPages: number
  /** Base path e.g. "/jobs", "/company/applications" */
  basePath: string
  /** Extra query params to preserve */
  searchParams?: Record<string, string | undefined>
  /** Max page buttons to show (default: 7) */
  maxVisible?: number
}

export function Pagination({
  currentPage,
  totalPages,
  basePath,
  searchParams = {},
  maxVisible = 7,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const buildHref = (page: number) => {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(searchParams)) {
      if (v && k !== "page") params.set(k, v)
    }
    params.set("page", String(page))
    return `${basePath}?${params.toString()}`
  }

  // Calculate visible page range
  const half = Math.floor(maxVisible / 2)
  let start = Math.max(1, currentPage - half)
  const end = Math.min(totalPages, start + maxVisible - 1)
  start = Math.max(1, end - maxVisible + 1)

  const pages: number[] = []
  for (let i = start; i <= end; i++) pages.push(i)

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="ページネーション">
      {currentPage > 1 && (
        <Link
          href={buildHref(currentPage - 1)}
          className="flex h-9 items-center gap-1 border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <ChevronLeft className="h-4 w-4" />
          前へ
        </Link>
      )}

      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          className={`flex h-9 min-w-9 items-center justify-center  px-3 text-sm font-medium transition ${
            p === currentPage
              ? "bg-primary-500 text-white shadow-sm"
              : "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          }`}
        >
          {p}
        </Link>
      ))}

      {currentPage < totalPages && (
        <Link
          href={buildHref(currentPage + 1)}
          className="flex h-9 items-center gap-1 border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          次へ
          <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </nav>
  )
}

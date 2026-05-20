import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { Search } from "lucide-react"
import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { SaveSearchButton } from "@/components/jobs/save-search-button"

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const params = await searchParams
  const parts = []
  if (params.prefecture) parts.push(params.prefecture)
  if (params.category) parts.push(categoryLabel(params.category))
  const title = parts.length > 0 ? `${parts.join(" ")}の求人一覧` : "求人検索"
  return { title }
}

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? "1"))
  const limit = 20

  const where = {
    status: "active" as const,
    ...(params.prefecture && { prefecture: params.prefecture }),
    ...(params.category && { category: params.category }),
    ...(params.employment_type && { employmentType: params.employment_type }),
    ...(params.salary_min && { salaryMin: { gte: Number(params.salary_min) } }),
    ...(params.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" as const } },
        { description: { contains: params.q, mode: "insensitive" as const } },
      ],
    }),
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { publishedAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        company: { select: { id: true, name: true, logoUrl: true } },
      },
    }),
    prisma.job.count({ where }),
  ])

  const totalPages = Math.ceil(total / limit)

  const session = await auth()
  const sessionRole = (session?.user as { role?: string } | undefined)?.role
  const isSeeker = !!session?.user?.id && (!sessionRole || sessionRole === "seeker")

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Search Bar */}
      <form action="/jobs" className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="職種・キーワードで検索"
            className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {/* Preserve existing filters */}
        {params.prefecture && <input type="hidden" name="prefecture" value={params.prefecture} />}
        {params.category && <input type="hidden" name="category" value={params.category} />}
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
      </form>

      {/* Filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        {params.prefecture && (
          <FilterBadge label={params.prefecture} paramName="prefecture" params={params} />
        )}
        {params.category && (
          <FilterBadge label={categoryLabel(params.category)} paramName="category" params={params} />
        )}
        {params.employment_type && (
          <FilterBadge label={employmentTypeLabel(params.employment_type)} paramName="employment_type" params={params} />
        )}
      </div>

      {/* Results Header */}
      <div className="mt-6 flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-semibold text-gray-900">{total.toLocaleString()}</span> 件の求人
        </p>
        <SaveSearchButton
          enabled={isSeeker}
          filters={{
            prefecture: params.prefecture ?? null,
            category: params.category ?? null,
            employmentType: params.employment_type ?? null,
            salaryMin: params.salary_min ? Number(params.salary_min) : null,
            keyword: params.q ?? null,
          }}
        />
      </div>

      {/* Job List */}
      <div className="mt-4 space-y-3">
        {jobs.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center">
            <p className="text-gray-500">条件に合う求人が見つかりませんでした。</p>
          </div>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <nav className="mt-8 flex justify-center gap-2">
          {page > 1 && (
            <PaginationLink page={page - 1} params={params} label="前へ" />
          )}
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i
            if (p > totalPages) return null
            return (
              <PaginationLink
                key={p}
                page={p}
                params={params}
                label={String(p)}
                active={p === page}
              />
            )
          })}
          {page < totalPages && (
            <PaginationLink page={page + 1} params={params} label="次へ" />
          )}
        </nav>
      )}
    </div>
  )
}

function FilterBadge({
  label,
  paramName,
  params,
}: {
  label: string
  paramName: string
  params: Record<string, string | undefined>
}) {
  const newParams = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (k !== paramName && v) newParams.set(k, v)
  }
  return (
    <a
      href={`/jobs?${newParams.toString()}`}
      className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-200"
    >
      {label}
      <span className="text-blue-400">&times;</span>
    </a>
  )
}

function PaginationLink({
  page,
  params,
  label,
  active = false,
}: {
  page: number
  params: Record<string, string | undefined>
  label: string
  active?: boolean
}) {
  const newParams = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v) newParams.set(k, v)
  }
  newParams.set("page", String(page))
  return (
    <a
      href={`/jobs?${newParams.toString()}`}
      className={`rounded-lg border px-3 py-2 text-sm ${
        active
          ? "border-blue-600 bg-blue-600 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
      }`}
    >
      {label}
    </a>
  )
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    driver: "ドライバー・運転手",
    construction: "建設・土木",
    manufacturing: "製造・工場",
  }
  return labels[category] ?? category
}

function employmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return labels[type] ?? type
}

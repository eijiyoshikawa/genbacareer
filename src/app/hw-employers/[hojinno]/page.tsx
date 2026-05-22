import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { Building2, ChevronLeft, Globe, ListChecks } from "lucide-react"
import { getHwEmployerJobs } from "@/lib/jobs-api"
import { safeFetch } from "@/lib/jobs-api/safe-fetch"
import { HwJobCard } from "@/components/hw-jobs/hw-job-card"
import { HwPagination } from "@/components/hw-jobs/hw-pagination"
import { HwApiUnavailable } from "@/components/hw-jobs/hw-api-unavailable"

export const revalidate = 600

interface PageProps {
  params: Promise<{ hojinno: string }>
  searchParams: Promise<Record<string, string | undefined>>
}

const DEFAULT_LIMIT = 20

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { hojinno } = await params
  const result = await safeFetch(() => getHwEmployerJobs(hojinno, { limit: 1 }))
  if (!result.ok || !result.data?.employer?.name) {
    return { title: "事業所" }
  }
  return {
    title: `${result.data.employer.name}の求人`,
    description: result.data.employer.description?.slice(0, 160) ?? undefined,
  }
}

export default async function HwEmployerPage({ params, searchParams }: PageProps) {
  const { hojinno } = await params
  const sp = await searchParams
  const offset = clampInt(sp.offset, 0, 0)
  const limit = clampInt(sp.limit, DEFAULT_LIMIT, DEFAULT_LIMIT)

  const result = await safeFetch(() =>
    getHwEmployerJobs(hojinno, { offset, limit }),
  )

  if (!result.ok && result.reason === "not-found") notFound()

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BackLink />
        <div className="mt-4">
          <HwApiUnavailable
            reason={result.reason as "not-configured" | "upstream-error"}
            message={result.message}
          />
        </div>
      </div>
    )
  }

  const { employer, items, pagination } = result.data

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <BackLink />

      <header className="mt-4  border bg-white p-5 shadow-sm">
        <p className="flex items-center gap-1 text-xs text-gray-500">
          <Building2 className="h-3.5 w-3.5" />
          事業所
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          {employer?.name ?? "（事業所名なし）"}
        </h1>
        {employer?.nameKana && (
          <p className="mt-0.5 text-sm text-gray-500">{employer.nameKana}</p>
        )}

        {(employer?.website || employer?.hojinno) && (
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
            {employer?.website && (
              <a
                href={employer.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary-600 hover:underline"
              >
                <Globe className="h-3.5 w-3.5" />
                公式サイト
              </a>
            )}
            {employer?.hojinno && (
              <span className="text-gray-500">法人番号: {employer.hojinno}</span>
            )}
          </div>
        )}

        {employer?.description && (
          <div className="mt-4">
            <h2 className="text-xs font-semibold text-gray-500">事業内容</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {employer.description}
            </p>
          </div>
        )}

        {employer?.strengths && (
          <div className="mt-4">
            <h2 className="text-xs font-semibold text-gray-500">会社の特長</h2>
            <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
              {employer.strengths}
            </p>
          </div>
        )}
      </header>

      <section className="mt-6">
        <h2 className="flex items-center gap-1 text-base font-semibold text-gray-900">
          <ListChecks className="h-4 w-4" />
          掲載中の求人（{pagination.total.toLocaleString()} 件）
        </h2>

        <ul className="mt-3 space-y-3">
          {items.map((job) => (
            <li key={job.kjno}>
              <HwJobCard job={job} />
            </li>
          ))}
        </ul>

        <HwPagination
          basePath={`/hw-employers/${encodeURIComponent(hojinno)}`}
          baseQuery={{}}
          offset={offset}
          limit={limit}
          total={pagination.total}
        />
      </section>
    </div>
  )
}

function BackLink() {
  return (
    <Link
      href="/hw-jobs"
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600"
    >
      <ChevronLeft className="h-4 w-4" />
      求人一覧に戻る
    </Link>
  )
}

function clampInt(raw: string | undefined, fallback: number, min: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < min) return fallback
  return n
}

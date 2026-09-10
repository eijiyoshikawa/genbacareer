import Link from "next/link"
import type { Metadata } from "next"
import { listHwJobs } from "@/lib/jobs-api"
import { safeFetch } from "@/lib/jobs-api/safe-fetch"
import { HwJobCard } from "@/components/hw-jobs/hw-job-card"
import { HwSearchForm } from "@/components/hw-jobs/hw-search-form"
import { HwPagination } from "@/components/hw-jobs/hw-pagination"
import { HwLastSynced } from "@/components/hw-jobs/hw-last-synced"
import { HwEmptyState } from "@/components/hw-jobs/hw-empty-state"
import { HwApiUnavailable } from "@/components/hw-jobs/hw-api-unavailable"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import {
  GuestSignupCta,
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"

// auth() で cookie を読むため、自動的に dynamic レンダリングになる。
export const dynamic = "force-dynamic"

type SearchParams = Record<string, string | undefined>

interface PageProps {
  searchParams: Promise<SearchParams>
}

const DEFAULT_LIMIT = 20

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = await searchParams
  const parts: string[] = []
  if (params.prefecture) parts.push(params.prefecture)
  if (params.jobType) parts.push(params.jobType)
  if (params.q) parts.push(`「${params.q}」`)
  const title = parts.length
    ? `${parts.join(" / ")}の公共求人`
    : "公共求人検索"
  return {
    title,
    description:
      "全国の公共求人をまとめて検索。建築・土木・設備・解体・製造・運転など現場系職種を網羅。最終更新日時を併記し、原文を改変せず転載しています。",
    // canonical はクエリ無しの /hw-jobs に固定（/jobs と同じ方針。
    // prefecture/jobType/q の組み合わせごとに別 URL が重複コンテンツ扱いされるのを防ぐ）
    alternates: { canonical: "/hw-jobs" },
  }
}

export default async function HwJobsPage({ searchParams }: PageProps) {
  const params = await searchParams

  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件で固定。
  // offset / limit パラメータも無視して 1 ページ目を返す。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  const offset = loggedIn ? clampInt(params.offset, 0, 0) : 0
  const limit = loggedIn
    ? clampInt(params.limit, DEFAULT_LIMIT, DEFAULT_LIMIT)
    : GUEST_LIMIT

  const result = await safeFetch(() =>
    listHwJobs({
      prefecture: params.prefecture,
      jobType: params.jobType,
      employmentType: params.employmentType,
      minSalary: params.minSalary ? Number(params.minSalary) : undefined,
      q: params.q,
      offset,
      limit,
    }),
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h1 className="text-2xl font-bold text-gray-900">公共求人</h1>
          {result.ok && (
            <p className="text-sm text-gray-500">全 {result.data.pagination.total.toLocaleString()} 件</p>
          )}
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 border border-primary-200 bg-white px-3 py-1 text-xs font-medium text-primary-600 hover:bg-brand-yellow-50"
        >
          自社掲載求人を見る
        </Link>
      </header>
      <p className="mt-1 text-xs text-gray-500">
        公共職業安定所の公開情報より転載しています。原文を改変せず掲載しています。
      </p>

      <div className="mt-6">
        <HwSearchForm
          values={{
            prefecture: params.prefecture,
            jobType: params.jobType,
            employmentType: params.employmentType,
            minSalary: params.minSalary,
            q: params.q,
          }}
        />
      </div>

      <section className="mt-6">
        {!result.ok && result.reason === "not-configured" && (
          <HwApiUnavailable reason="not-configured" />
        )}
        {!result.ok && result.reason === "upstream-error" && (
          <HwApiUnavailable reason="upstream-error" message={result.message} />
        )}
        {!result.ok && result.reason === "not-found" && <HwEmptyState />}

        {result.ok && result.data.items.length === 0 && <HwEmptyState />}

        {result.ok && result.data.items.length > 0 && (
          <>
            {!loggedIn && result.data.pagination.total > GUEST_LIMIT && (
              <div className="mb-4">
                <GuestTrialBanner
                  limit={GUEST_LIMIT}
                  total={result.data.pagination.total}
                />
              </div>
            )}
            <ul className="space-y-3">
              {result.data.items.map((job) => (
                <li key={job.kjno}>
                  <HwJobCard job={job} />
                </li>
              ))}
            </ul>

            {loggedIn ? (
              <HwPagination
                basePath="/hw-jobs"
                baseQuery={{
                  prefecture: params.prefecture,
                  jobType: params.jobType,
                  employmentType: params.employmentType,
                  minSalary: params.minSalary,
                  q: params.q,
                }}
                offset={offset}
                limit={limit}
                total={result.data.pagination.total}
              />
            ) : (
              result.data.pagination.total > result.data.items.length && (
                <div className="mt-6">
                  <GuestSignupCta
                    total={result.data.pagination.total}
                    shown={result.data.items.length}
                    callbackUrl="/hw-jobs"
                  />
                </div>
              )
            )}
          </>
        )}
      </section>

      {result.ok && <HwLastSynced isoDatetime={result.data.meta.lastSyncedAt} />}
    </div>
  )
}

function clampInt(raw: string | undefined, fallback: number, min: number): number {
  if (!raw) return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < min) return fallback
  return n
}

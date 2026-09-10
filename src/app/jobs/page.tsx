import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { EmptyJobsState } from "@/components/jobs/empty-jobs-state"
import { CompareCart } from "@/components/jobs/compare-cart"
import { Briefcase, Search, SlidersHorizontal } from "lucide-react"
import Link from "next/link"
import { Pagination } from "@/components/pagination"
import { PREFECTURES } from "@/lib/constants"
import { AREAS } from "@/lib/areas"
import {
  CATEGORIES,
  CONSTRUCTION_CATEGORY_VALUES,
  getCategoryLabel,
  isConstructionCategory,
} from "@/lib/categories"
import { auth } from "@/lib/auth"
import { SaveSearchButton } from "@/components/jobs/save-search-button"
import {
  GuestSignupCta,
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import { logSearch } from "@/lib/search-log"
import { trackEvent } from "@/lib/track"
import type { Metadata } from "next"

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "正社員" },
  { value: "part_time", label: "パート" },
  { value: "contract", label: "契約社員" },
] as const

const SORT_OPTIONS = [
  { value: "recommended", label: "おすすめ順" },
  { value: "newest", label: "新着順" },
  { value: "salary_high", label: "給与が高い順" },
  { value: "salary_low", label: "給与が低い順" },
  { value: "popular", label: "閲覧数が多い順" },
] as const

const SOURCE_OPTIONS = [
  { value: "direct", label: "認定企業のみ" },
  { value: "hellowork", label: "公共求人のみ" },
] as const

const DATE_WITHIN_OPTIONS = [
  { value: "3", label: "3日以内" },
  { value: "7", label: "1週間以内" },
  { value: "14", label: "2週間以内" },
  { value: "30", label: "1ヶ月以内" },
] as const

const MAN_YEN = 10_000

export async function generateMetadata({
  searchParams,
}: Props): Promise<Metadata> {
  const params = await searchParams
  const parts: string[] = []
  if (params.prefecture) parts.push(params.prefecture)
  if (params.city) parts.push(params.city)
  if (params.category) parts.push(getCategoryLabel(params.category))
  const title =
    parts.length > 0
      ? `${parts.join(" ")}の建設業求人 | ゲンバキャリア`
      : "建設業の求人を探す | ゲンバキャリア"
  const description = parts.length
    ? `${parts.join(" ")}で募集中の建設業求人を掲載中。20〜30 代の若手も活躍中、LINE で気軽に応募できます。`
    : "建築・土木・電気・内装の求人を探せる建設業特化型求人サイト。20〜30 代の若手も活躍中、履歴書なし LINE で気軽に応募。"

  // canonical はクエリ無しの /jobs に固定（カテゴリ別ページが個別 URL を持っているため）
  return {
    title,
    description,
    alternates: { canonical: "/jobs" },
    openGraph: { title, description },
  }
}

export default async function JobsPage({ searchParams }: Props) {
  const params = await searchParams

  // 保存検索ボタン用にログイン状態だけ拾う（fail-safe）
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id

  // 17.3 ブロック企業 / NG キーワード: ログイン中の求職者だけ反映
  const blockSettings = loggedIn
    ? await prisma.user
        .findUnique({
          where: { id: session!.user!.id! },
          select: { blockedCompanyIds: true, blockedKeywords: true },
        })
        .catch(() => null)
    : null
  const blockedCompanyIds = blockSettings?.blockedCompanyIds ?? []
  const blockedKeywords = blockSettings?.blockedKeywords ?? []

  // 未登録ユーザーには「お試し検索」として上位 GUEST_LIMIT 件のみ。
  // ページネーションも無効化し、`page` パラメータは無視する。
  const rawPage = Math.max(1, Number(params.page ?? "1"))
  const page = loggedIn ? rawPage : 1
  const limit = loggedIn ? 20 : GUEST_LIMIT

  const salaryMinYen = parseManYenToYen(params.salary_min)
  const salaryMaxYen = parseManYenToYen(params.salary_max)
  const dateWithinDays = parseDateWithin(params.date_within)
  const dateWithinThreshold = computeDateWithinThreshold(dateWithinDays)
  const sort =
    (params.sort && SORT_OPTIONS.find((s) => s.value === params.sort)?.value) ??
    "recommended"

  // 建設業特化サイトのため、非建設業カテゴリは常に除外する。
  // ユーザー指定が建設業カテゴリならその値、そうでなければ建設業全体に絞る。
  const categoryFilter =
    params.category && isConstructionCategory(params.category)
      ? { category: params.category }
      : { category: { in: [...CONSTRUCTION_CATEGORY_VALUES] } }

  const sourceFilter =
    params.source && SOURCE_OPTIONS.find((s) => s.value === params.source)
      ? { source: params.source }
      : {}

  // 17.3 ブロック企業 / NG キーワード除外。あいまい検索（fuzzy）経路でも
  // 適用する必要があるため、where 本体とは別に切り出す
  // （id IN (...) だけで再クエリする fuzzy 経路に where 全体を混ぜると、
  // 通常検索用の q 完全一致 OR 条件が類似度一致の結果を逆に弾いてしまうため）。
  const blockFilters = {
    ...(blockedCompanyIds.length > 0 && {
      companyId: { notIn: blockedCompanyIds },
    }),
    ...(blockedKeywords.length > 0 && {
      AND: blockedKeywords.map((kw) => ({
        title: { not: { contains: kw, mode: "insensitive" as const } },
        description: { not: { contains: kw, mode: "insensitive" as const } },
      })),
    }),
  }

  const where = {
    status: "active" as const,
    ...(params.prefecture && { prefecture: params.prefecture }),
    ...(params.city && { city: params.city }),
    ...categoryFilter,
    ...sourceFilter,
    ...(params.employment_type && { employmentType: params.employment_type }),
    ...(salaryMinYen !== null && { salaryMin: { gte: salaryMinYen } }),
    ...(salaryMaxYen !== null && { salaryMax: { lte: salaryMaxYen } }),
    ...(dateWithinThreshold && { publishedAt: { gte: dateWithinThreshold } }),
    ...(params.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" as const } },
        { description: { contains: params.q, mode: "insensitive" as const } },
      ],
    }),
    ...blockFilters,
  }

  const orderBy = buildOrderBy(sort)

  // 検索クエリがあり、デフォルトの「おすすめ順」の場合は pg_trgm で類似度順に並べる
  const useFuzzy = !!params.q && sort === "recommended"
  let fuzzyIds: string[] | null = null
  let fuzzyTotal = 0
  if (useFuzzy) {
    const { fuzzySearchJobs, countFuzzyMatches } = await import("@/lib/job-search")
    const fuzzyInput = {
      q: params.q!,
      prefecture: params.prefecture,
      city: params.city,
      category: params.category,
      employmentType: params.employment_type,
      source: params.source,
      salaryMin: salaryMinYen ?? undefined,
      salaryMax: salaryMaxYen ?? undefined,
      publishedSince: dateWithinThreshold ?? undefined,
      // 17.3 ブロック企業 / NG キーワードは SQL 側で除外する
      // （後段で id IN (...) に対して再度フィルタすると、ちょうど
      // このページの求人がブロック対象だった場合に limit 件に満たない
      // ページが返ってしまう）。
      excludeCompanyIds: blockedCompanyIds.length > 0 ? blockedCompanyIds : undefined,
      excludeKeywords: blockedKeywords.length > 0 ? blockedKeywords : undefined,
    }
    // limit*5 で多めに取得して client 側で切り出す方式だと、100 件を超える
    // 一致がある人気キーワードで後続ページに永遠に到達できなかった
    // （fuzzySearchJobs 内部の上限 100 件でも頭打ちになる）。
    // offset を正しく渡し、総件数は別途 countFuzzyMatches で取得する。
    const [rows, count] = await Promise.all([
      fuzzySearchJobs({
        ...fuzzyInput,
        limit,
        offset: (page - 1) * limit,
      }),
      countFuzzyMatches(fuzzyInput),
    ])
    if (rows && rows.length > 0) {
      fuzzyIds = rows.map((r) => r.id)
    }
    fuzzyTotal = count ?? fuzzyIds?.length ?? 0
  }

  // 一覧表示用の最小カラムのみ select。Job.description (長文) や
  // company.gbizData (大きな JSON) など重いカラムは取得しない。
  const jobListSelect = {
    id: true,
    title: true,
    category: true,
    employmentType: true,
    salaryMin: true,
    salaryMax: true,
    salaryType: true,
    prefecture: true,
    city: true,
    source: true,
    tags: true,
    annualHolidays: true,
    insurance: true,
    companyId: true,
    publishedAt: true,
    company: {
      select: {
        id: true,
        name: true,
        logoUrl: true,
        // gbizData は keys だけで容量大きいので一覧では取らない。
        // バッジ表示はカテゴリ判定 (computeHasConstructionPermit)
        // で必要だが、一覧では割愛し、詳細ページで表示する方針。
      },
    },
  } as const

  const [jobs, total] = await Promise.all([
    fuzzyIds
      ? prisma.job
          .findMany({
            // ブロック企業 / NG キーワード除外は fuzzySearchJobs 側の SQL で
            // 既に適用済み。fuzzyIds は既に該当ページ分だけに絞られている
            // ので、ここでは再フィルタ・再スライスしない
            // （再フィルタすると limit 件に満たないページが返り得る）。
            where: { id: { in: fuzzyIds } },
            select: jobListSelect,
          })
          // fuzzy で返ってきた id 順（類似度順）を維持
          .then((rows) => {
            const order = new Map(fuzzyIds!.map((id, i) => [id, i]))
            return rows.sort(
              (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0)
            )
          })
      : prisma.job.findMany({
          where,
          orderBy,
          skip: (page - 1) * limit,
          take: limit,
          select: jobListSelect,
        }),
    fuzzyIds ? Promise.resolve(fuzzyTotal) : prisma.job.count({ where }),
  ])

  // ログイン中ならお気に入り Set を取得（カードの星表示用）
  const favoriteIds = loggedIn
    ? new Set(
        (
          await prisma.jobFavorite
            .findMany({
              where: {
                userId: session!.user!.id!,
                jobId: { in: jobs.map((j) => j.id) },
              },
              select: { jobId: true },
            })
            .catch(() => [])
        ).map((f) => f.jobId)
      )
    : new Set<string>()

  const totalPages = Math.ceil(total / limit)

  // C3: 検索クエリと結果件数をログに記録 (fire-and-forget)
  logSearch({
    query: params.q,
    prefecture: params.prefecture,
    category: params.category,
    resultCount: total,
  })

  // 13.4 独自イベントトラッキング（同じデータを AnalyticsEvent にも記録）
  void trackEvent({
    name: "search",
    payload: {
      query: params.q ?? null,
      prefecture: params.prefecture ?? null,
      category: params.category ?? null,
      employmentType: params.employmentType ?? null,
      salaryMin: params.salaryMin ?? null,
      resultCount: total,
    },
  })

  const cities = params.prefecture ? AREAS[params.prefecture] ?? [] : []
  const hasFilters = !!(
    params.prefecture ||
    params.city ||
    params.category ||
    params.employment_type ||
    params.salary_min ||
    params.salary_max ||
    params.date_within ||
    params.source ||
    params.q
  )

  return (
    <div>
      {/* Search header */}
      <div className="relative bg-ink-900">
        <div className="hero-stripe-top" />
        <div className="hero-stripe-bottom" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">求人検索</h1>
            <Link
              href="/hw-jobs"
              className="inline-flex items-center gap-1 bg-white/10 px-3 py-1 text-xs text-white/90 hover:bg-white/20 transition"
            >
              <Briefcase className="h-3.5 w-3.5" />
              公共求人を見る
            </Link>
          </div>
          <form action="/jobs" className="mt-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="q"
                  defaultValue={params.q ?? ""}
                  placeholder="職種・キーワードで検索"
                  className="w-full  border-0 py-2.5 pl-10 pr-4 text-sm shadow-sm focus:ring-2 focus:ring-primary-400"
                />
              </div>
              <button
                type="submit"
                className="flex items-center gap-1.5 bg-primary-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-600 transition"
              >
                <Search className="h-4 w-4" />
                検索
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Sidebar filters */}
          <aside className="w-full shrink-0 lg:w-64">
            <form action="/jobs">
              {/* Preserve keyword if set */}
              {params.q && <input type="hidden" name="q" value={params.q} />}
              {params.sort && params.sort !== "newest" && (
                <input type="hidden" name="sort" value={params.sort} />
              )}

              <div className=" border bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b px-4 py-3">
                  <SlidersHorizontal className="h-4 w-4 text-primary-500" />
                  <h2 className="text-sm font-bold text-gray-900">絞り込み</h2>
                </div>

                <div className="divide-y p-4 space-y-0">
                  <FilterSelect
                    id="prefecture"
                    label="都道府県"
                    name="prefecture"
                    defaultValue={params.prefecture ?? ""}
                    options={PREFECTURES.map((p) => ({ value: p, label: p }))}
                  />

                  {params.prefecture && cities.length > 0 && (
                    <FilterSelect
                      id="city"
                      label="市区町村"
                      name="city"
                      defaultValue={params.city ?? ""}
                      options={cities.map((c) => ({ value: c, label: c }))}
                    />
                  )}

                  <FilterSelect
                    id="category"
                    label="職種カテゴリ"
                    name="category"
                    defaultValue={params.category ?? ""}
                    options={CATEGORIES.filter((c) => c.value !== "other").map(
                      (c) => ({ value: c.value, label: c.label })
                    )}
                  />

                  <FilterSelect
                    id="employment_type"
                    label="雇用形態"
                    name="employment_type"
                    defaultValue={params.employment_type ?? ""}
                    options={EMPLOYMENT_TYPES.map((e) => ({ value: e.value, label: e.label }))}
                  />

                  <FilterSelect
                    id="source"
                    label="掲載元"
                    name="source"
                    defaultValue={params.source ?? ""}
                    options={SOURCE_OPTIONS as readonly { value: string; label: string }[]}
                  />

                  <FilterSelect
                    id="date_within"
                    label="掲載期間"
                    name="date_within"
                    defaultValue={params.date_within ?? ""}
                    options={DATE_WITHIN_OPTIONS as readonly { value: string; label: string }[]}
                  />

                  <div className="pt-3">
                    <span className="block text-xs font-medium text-gray-600">月給（万円）</span>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        id="salary_min"
                        name="salary_min"
                        defaultValue={params.salary_min ?? ""}
                        placeholder="下限"
                        min={0}
                        className="w-full  border border-gray-300 px-2.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                      <span className="text-xs text-gray-400">〜</span>
                      <input
                        type="number"
                        id="salary_max"
                        name="salary_max"
                        defaultValue={params.salary_max ?? ""}
                        placeholder="上限"
                        min={0}
                        className="w-full  border border-gray-300 px-2.5 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t p-4">
                  <button
                    type="submit"
                    className="w-full  bg-primary-600 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition"
                  >
                    この条件で検索
                  </button>
                  {hasFilters && (
                    <Link
                      href="/jobs"
                      className="mt-2 block text-center text-xs text-gray-500 hover:text-primary-600"
                    >
                      条件をリセット
                    </Link>
                  )}
                </div>
              </div>
            </form>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Active filters + result count + sort */}
            <div className="flex flex-wrap items-center gap-2">
              {params.prefecture && (
                <FilterBadge label={params.prefecture} paramName="prefecture" params={params} />
              )}
              {params.city && (
                <FilterBadge label={params.city} paramName="city" params={params} />
              )}
              {params.category && (
                <FilterBadge label={getCategoryLabel(params.category)} paramName="category" params={params} />
              )}
              {params.employment_type && (
                <FilterBadge
                  label={employmentTypeLabel(params.employment_type)}
                  paramName="employment_type"
                  params={params}
                />
              )}
              {params.date_within && (
                <FilterBadge
                  label={dateWithinLabel(params.date_within)}
                  paramName="date_within"
                  params={params}
                />
              )}
              {params.source && (
                <FilterBadge
                  label={sourceLabel(params.source)}
                  paramName="source"
                  params={params}
                />
              )}
              {(params.salary_min || params.salary_max) && (
                <FilterBadge
                  label={salaryRangeLabel(params.salary_min, params.salary_max)}
                  paramName="salary_min,salary_max"
                  params={params}
                />
              )}
              <span className="ml-auto text-sm text-gray-500">
                <span className="font-bold text-primary-600">{total.toLocaleString()}</span> 件
              </span>
              {hasFilters && (
                <SaveSearchButton
                  loggedIn={loggedIn}
                  defaultName={buildSearchName(params)}
                  q={params.q}
                  prefecture={params.prefecture}
                  city={params.city}
                  category={params.category}
                  employmentType={params.employment_type}
                  salaryMin={salaryMinYen ?? undefined}
                  source={params.source}
                />
              )}
              <SortLink params={params} sort={sort} />
            </div>

            {/* お試し閲覧バナー（未登録 & ヒットあり時のみ） */}
            {!loggedIn && total > 0 && (
              <div className="mt-4">
                <GuestTrialBanner limit={GUEST_LIMIT} total={total} />
              </div>
            )}

            {/* Job list */}
            <div className="mt-4 space-y-3">
              {jobs.length === 0 ? (
                <EmptyJobsState
                  params={{
                    q: params.q,
                    category: params.category,
                    prefecture: params.prefecture,
                    city: params.city,
                    employment_type: params.employment_type,
                  }}
                  favoriteIds={favoriteIds}
                  loggedIn={loggedIn}
                />
              ) : (
                jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isFavorite={favoriteIds.has(job.id)}
                    loggedIn={loggedIn}
                  />
                ))
              )}
            </div>

            {/* 未登録ユーザーの上限到達時 CTA */}
            {!loggedIn && total > GUEST_LIMIT && (
              <div className="mt-4">
                <GuestSignupCta
                  total={total}
                  shown={jobs.length}
                  callbackUrl={buildCallbackUrl(params)}
                />
              </div>
            )}

            {/* Pagination（ログイン時のみ） */}
            {loggedIn && (
              <div className="mt-8">
                <Pagination
                  currentPage={page}
                  totalPages={totalPages}
                  basePath="/jobs"
                  searchParams={params}
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <CompareCart />
    </div>
  )
}

// ---------------- helpers ----------------

function buildOrderBy(sort: string) {
  switch (sort) {
    case "salary_high":
      return [{ salaryMin: "desc" as const }, { publishedAt: "desc" as const }]
    case "salary_low":
      return [{ salaryMin: "asc" as const }, { publishedAt: "desc" as const }]
    case "popular":
      return [{ viewCount: "desc" as const }, { publishedAt: "desc" as const }]
    case "newest":
      return { publishedAt: "desc" as const }
    case "recommended":
    default:
      // C8 上位表示 + 公平ローテーション:
      //   1. company.planTier desc — プラン優先度 (3=paid / 2=SNS / 1=キャンペーン / 0=HW)
      //   2. company.rotationKey asc — 日次でランダム化 (paid 平等枠の機会均等)
      //   3. rankScore desc — 同 rotationKey 内では既存のコンテンツ品質順
      //   4. publishedAt desc — タイブレーク
      // rotationKey は /api/cron/rotate-companies が毎日 03:30 UTC に更新する。
      return [
        { company: { planTier: "desc" as const } },
        { company: { rotationKey: "asc" as const } },
        { rankScore: "desc" as const },
        { publishedAt: "desc" as const },
      ]
  }
}

function parseManYenToYen(raw: string | undefined): number | null {
  if (!raw) return null
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return null
  return Math.floor(n * MAN_YEN)
}

function computeDateWithinThreshold(days: number | null): Date | null {
  if (days === null) return null
  const now = Date.now()
  return new Date(now - days * 86_400_000)
}

function parseDateWithin(raw: string | undefined): number | null {
  if (!raw) return null
  const allowed: string[] = DATE_WITHIN_OPTIONS.map((o) => o.value)
  if (!allowed.includes(raw)) return null
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : null
}

function FilterSelect({
  id, label, name, defaultValue, options,
}: {
  id: string
  label: string
  name: string
  defaultValue: string
  options: readonly { value: string; label: string }[]
}) {
  return (
    <div className="pt-3 first:pt-0">
      <label htmlFor={id} className="block text-xs font-medium text-gray-600">
        {label}
      </label>
      <select
        id={id}
        name={name}
        defaultValue={defaultValue}
        className="mt-1 w-full  border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
      >
        <option value="">すべて</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  )
}

function FilterBadge({
  label, paramName, params,
}: {
  label: string
  paramName: string
  params: Record<string, string | undefined>
}) {
  const removeKeys = paramName.split(",")
  const newParams = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (!v) continue
    if (removeKeys.includes(k)) continue
    newParams.set(k, v)
  }
  if (removeKeys.includes("prefecture")) newParams.delete("city")
  newParams.delete("page")
  const href = newParams.toString() ? `/jobs?${newParams.toString()}` : "/jobs"
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 bg-primary-100 px-3 py-1 text-xs font-medium text-primary-700 hover:bg-primary-200 transition"
    >
      {label}
      <span className="text-primary-400">&times;</span>
    </a>
  )
}

function SortLink({
  params, sort,
}: {
  params: Record<string, string | undefined>
  sort: string
}) {
  const buildHref = (next: string) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(params)) {
      if (k === "sort" || k === "page") continue
      if (v) sp.set(k, v)
    }
    if (next !== "newest") sp.set("sort", next)
    return sp.toString() ? `/jobs?${sp.toString()}` : "/jobs"
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs">
      <span className="text-gray-600 font-medium mr-1">並び順:</span>
      {SORT_OPTIONS.map((opt) => (
        <a
          key={opt.value}
          href={buildHref(opt.value)}
          className={`inline-flex items-center px-3 py-1.5 text-xs font-medium border transition ${
            opt.value === sort
              ? "bg-primary-600 text-white border-primary-600 shadow-sm"
              : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300"
          }`}
          aria-current={opt.value === sort ? "true" : undefined}
        >
          {opt.label}
        </a>
      ))}
    </div>
  )
}

function employmentTypeLabel(type: string): string {
  const labels: Record<string, string> = { full_time: "正社員", part_time: "パート", contract: "契約社員" }
  return labels[type] ?? type
}

function dateWithinLabel(value: string): string {
  return DATE_WITHIN_OPTIONS.find((o) => o.value === value)?.label ?? `${value}日以内`
}

function sourceLabel(value: string): string {
  return SOURCE_OPTIONS.find((o) => o.value === value)?.label ?? value
}

function buildSearchName(p: Record<string, string | undefined>): string {
  const parts: string[] = []
  if (p.prefecture) parts.push(p.prefecture)
  if (p.city) parts.push(p.city)
  if (p.category) parts.push(getCategoryLabel(p.category))
  if (p.q) parts.push(`「${p.q}」`)
  return parts.length > 0 ? parts.join(" / ") : "建設業求人"
}

/** 登録後に戻ってくる /jobs?... URL を組み立てる（page パラメータは除外） */
function buildCallbackUrl(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (!v || k === "page") continue
    sp.set(k, v)
  }
  return sp.toString() ? `/jobs?${sp.toString()}` : "/jobs"
}

function salaryRangeLabel(min: string | undefined, max: string | undefined): string {
  if (min && max) return `月給 ${min}〜${max}万円`
  if (min) return `月給 ${min}万円〜`
  if (max) return `月給 〜${max}万円`
  return "月給"
}

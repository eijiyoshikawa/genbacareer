import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { EmptyJobsState } from "@/components/jobs/empty-jobs-state"
import { CompareCart } from "@/components/jobs/compare-cart"
import { SearchAutocomplete } from "@/components/jobs/search-autocomplete"
import { ConditionFilterModal } from "@/components/jobs/condition-filter-modal"
import { SalaryRangeSlider } from "@/components/jobs/salary-range-slider"
import { SlidersHorizontal } from "lucide-react"
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
import {
  buildPublicJobOrderBy,
  type PublicJobSort,
} from "@/lib/job-sort"
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

const SNS_OPTIONS = [
  { value: "with", label: "SNS・動画あり" },
  { value: "without", label: "SNS・動画なし" },
] as const

// こだわり条件（複数選択モーダル用）。
// label は表示用、tags は実データの表記ゆれを吸収する候補（hasSome で OR 一致）。
const CONDITION_DEFS: Array<{ label: string; tags: string[] }> = [
  { label: "未経験歓迎", tags: ["未経験歓迎", "未経験OK", "未経験者歓迎", "未経験可"] },
  { label: "学歴不問", tags: ["学歴不問"] },
  { label: "資格取得支援", tags: ["資格取得支援", "資格支援", "資格取得制度", "資格取得支援制度"] },
  { label: "寮・社宅あり", tags: ["寮あり", "寮完備", "社宅あり", "住宅手当あり", "住宅手当", "寮・社宅あり"] },
  { label: "社会保険完備", tags: ["社会保険完備", "社保完備", "各種社会保険完備"] },
  { label: "土日祝休み", tags: ["土日祝休み", "土日休み", "土日祝日休み"] },
  { label: "完全週休2日", tags: ["完全週休2日制", "完全週休2日", "週休2日制", "週休2日"] },
  { label: "日払い・週払い", tags: ["日払い", "週払い", "日払いOK", "日払い可"] },
  { label: "高収入", tags: ["高収入", "月給30万円以上", "高給与"] },
  { label: "賞与あり", tags: ["賞与あり", "ボーナスあり", "賞与年2回"] },
  { label: "交通費支給", tags: ["交通費支給", "交通費全額支給", "交通費あり"] },
  { label: "車・バイク通勤OK", tags: ["車通勤OK", "バイク通勤OK", "マイカー通勤OK", "車・バイク通勤OK"] },
  { label: "転勤なし", tags: ["転勤なし"] },
  { label: "残業少なめ", tags: ["残業少なめ", "残業なし", "残業ほぼなし"] },
  { label: "40代活躍", tags: ["40代活躍", "40代歓迎", "40代も活躍"] },
  { label: "50代活躍", tags: ["50代活躍", "50代歓迎", "50代も活躍"] },
  { label: "60代活躍", tags: ["60代活躍", "60代歓迎", "シニア歓迎", "60代も活躍"] },
  { label: "直行直帰", tags: ["直行直帰", "直行直帰OK"] },
]
const CONDITION_OPTIONS: string[] = CONDITION_DEFS.map((c) => c.label)
const CONDITION_TAGMAP = new Map(CONDITION_DEFS.map((c) => [c.label, c.tags]))

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

  // SNS・動画(videoUrls)の有無で絞り込む
  const snsFilter =
    params.sns && SNS_OPTIONS.find((s) => s.value === params.sns)
      ? params.sns
      : undefined

  // こだわり条件（複数選択・カンマ区切り）。許可リスト(label)のみ採用。
  const conditionList = (params.conditions ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => CONDITION_OPTIONS.includes(s))
  // 表記ゆれを吸収したタグ候補に展開（hasSome で OR 一致）
  const conditionTagVariants = Array.from(
    new Set(conditionList.flatMap((l) => CONDITION_TAGMAP.get(l) ?? [l]))
  )

  const where = {
    status: "active" as const,
    ...(params.prefecture && { prefecture: params.prefecture }),
    ...(params.city && { city: params.city }),
    ...categoryFilter,
    ...sourceFilter,
    ...(params.employment_type && { employmentType: params.employment_type }),
    ...(salaryMinYen !== null && { salaryMin: { gte: salaryMinYen } }),
    ...(salaryMaxYen !== null && { salaryMax: { lte: salaryMaxYen } }),
    ...(snsFilter === "with" && { videoUrls: { isEmpty: false } }),
    ...(snsFilter === "without" && { videoUrls: { isEmpty: true } }),
    ...(conditionTagVariants.length > 0 && { tags: { hasSome: conditionTagVariants } }),
    ...(dateWithinThreshold && { publishedAt: { gte: dateWithinThreshold } }),
    ...(params.q && {
      OR: [
        { title: { contains: params.q, mode: "insensitive" as const } },
        { description: { contains: params.q, mode: "insensitive" as const } },
      ],
    }),
    // 17.3 ブロック企業除外
    ...(blockedCompanyIds.length > 0 && {
      companyId: { notIn: blockedCompanyIds },
    }),
    // 17.3 NG キーワード除外: title/description のいずれにも含まれない
    ...(blockedKeywords.length > 0 && {
      AND: blockedKeywords.map((kw) => ({
        title: { not: { contains: kw, mode: "insensitive" as const } },
        description: { not: { contains: kw, mode: "insensitive" as const } },
      })),
    }),
  }

  const orderBy = buildOrderBy(sort)

  // 検索クエリがあり、デフォルトの「おすすめ順」の場合は pg_trgm で類似度順に並べる
  // こだわり条件選択時は fuzzy を使わず Prisma where で正確に絞る
  const useFuzzy =
    !!params.q && sort === "recommended" && conditionList.length === 0
  let fuzzyIds: string[] | null = null
  let fuzzyTotal: number | null = null
  if (useFuzzy) {
    const { fuzzySearchJobs, fuzzySearchJobsCount } = await import(
      "@/lib/job-search"
    )
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
      hasVideo:
        snsFilter === "with"
          ? true
          : snsFilter === "without"
            ? false
            : undefined,
    }
    // ページ単位で直接 LIMIT/OFFSET する（旧実装は上位 100 件を毎回まとめて
    // 取得してからスライスしていたため、100 件超のヒットで総件数・ページ数を
    // 過小表示し、かつ 6 ページ目以降は常に空になっていた）。
    const [rows, count] = await Promise.all([
      fuzzySearchJobs({
        ...fuzzyInput,
        limit,
        offset: (page - 1) * limit,
      }),
      fuzzySearchJobsCount(fuzzyInput),
    ])
    if (rows && rows.length > 0) {
      fuzzyIds = rows.map((r) => r.id)
    }
    fuzzyTotal = count
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
    imageUrls: true,
    videoUrls: true,
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
    // fuzzyIds が null の場合（未検索 or pg_trgm 失敗によるフォールバック）は
    // 上の jobs 側と同じく通常の Prisma count を使う。
    fuzzyIds
      ? Promise.resolve(fuzzyTotal ?? fuzzyIds.length)
      : prisma.job.count({ where }),
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
    params.sns ||
    conditionList.length > 0 ||
    params.q
  )

  return (
    <div>
      {/* Search header — マイナビ風: 太字大型見出し + 強い検索 CTA + アイコン控えめ */}
      <div className="relative bg-ink-900">
        <div className="hero-stripe-top" />
        <div className="hero-stripe-bottom" />
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold tracking-[0.25em] text-brand-yellow-500 sm:text-sm">
                GENBA CAREER
              </p>
              <h1 className="mt-1 text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl lg:text-4xl">
                建設業の求人を探す
              </h1>
            </div>
            <Link
              href="/hw-jobs"
              className="hidden shrink-0 items-center gap-1 border border-white/30 bg-transparent px-3 py-1.5 text-xs font-bold text-white/90 transition hover:bg-white/10 sm:inline-flex"
            >
              公共求人を見る
            </Link>
          </div>
          <form action="/jobs" className="mt-5">
            <div className="flex gap-2">
              <SearchAutocomplete defaultValue={params.q ?? ""} />
              <button
                type="submit"
                className="bg-primary-500 px-5 py-3 text-sm font-black tracking-wide text-white shadow-sm transition hover:bg-primary-600 sm:px-7"
              >
                検索する
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

              <div className="border border-gray-200 bg-white shadow-sm">
                <div className="flex items-center gap-2 border-b border-ink-900/10 bg-ink-900 px-4 py-3">
                  <SlidersHorizontal className="h-4 w-4 text-brand-yellow-500" />
                  <h2 className="text-sm font-bold tracking-wide text-white">
                    絞り込み
                  </h2>
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
                    id="sns"
                    label="SNS・動画"
                    name="sns"
                    defaultValue={params.sns ?? ""}
                    options={SNS_OPTIONS as readonly { value: string; label: string }[]}
                  />

                  <FilterSelect
                    id="date_within"
                    label="掲載期間"
                    name="date_within"
                    defaultValue={params.date_within ?? ""}
                    options={DATE_WITHIN_OPTIONS as readonly { value: string; label: string }[]}
                  />

                  {/* こだわり条件（複数選択モーダル） */}
                  <ConditionFilterModal
                    options={CONDITION_OPTIONS}
                    initial={conditionList}
                  />

                  {/* 月給スライダー */}
                  <SalaryRangeSlider
                    initialMin={params.salary_min}
                    initialMax={params.salary_max}
                  />
                </div>

                <div className="border-t p-4">
                  <button
                    type="submit"
                    className="w-full bg-primary-500 py-3 text-sm font-black tracking-wide text-white shadow-sm transition hover:bg-primary-600"
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
              {params.sns && (
                <FilterBadge
                  label={snsLabel(params.sns)}
                  paramName="sns"
                  params={params}
                />
              )}
              {conditionList.length > 0 && (
                <FilterBadge
                  label={`こだわり ${conditionList.length}件`}
                  paramName="conditions"
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
            {jobs.length === 0 ? (
              <div className="mt-4">
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
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {jobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    isFavorite={favoriteIds.has(job.id)}
                    loggedIn={loggedIn}
                    variant="grid"
                  />
                ))}
              </div>
            )}

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
  // 主キーは Job.displayPriority (asc):
  //   1: direct (手入力) / 2: 月給完全 / 3: 月給不完全 / 4: 時給日給 / 5: その他
  // 詳細は src/lib/job-sort.ts を参照。
  const normalized: PublicJobSort =
    sort === "salary_high" ||
    sort === "salary_low" ||
    sort === "popular" ||
    sort === "newest"
      ? sort
      : "recommended"
  return buildPublicJobOrderBy(normalized, { includeCompanyTier: true })
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

function snsLabel(value: string): string {
  return SNS_OPTIONS.find((o) => o.value === value)?.label ?? value
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

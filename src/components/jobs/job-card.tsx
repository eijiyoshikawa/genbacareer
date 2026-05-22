import Link from "next/link"
import {
  MapPin,
  Money,
  Buildings,
  HardHat,
  CaretRight,
  CalendarCheck,
  ShieldCheck,
  SealCheck,
} from "@phosphor-icons/react/dist/ssr"
import { getCategoryLabel } from "@/lib/categories"
import { computeHasConstructionPermit } from "@/lib/gbizinfo"
import { TagChip } from "./tag-chip"
import { FavoriteButton } from "./favorite-button"
import { CompareAddButton } from "./compare-add-button"
import { JobCardActions } from "./job-card-actions"

type JobCardProps = {
  id: string
  title: string
  category: string
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  prefecture: string
  city: string | null
  source: string
  tags: string[]
  annualHolidays?: number | null
  insurance?: string | null
  company:
    | {
        name: string
        logoUrl: string | null
        /**
         * GbizINFO 由来の JSONB データ。
         * 渡すと JobCard 内で建設業許可の有無を判定して、保有時は
         * バッジを表示する。callsite は prisma select で
         * `company: { select: { ..., gbizData: true } }` を追加するだけで OK。
         */
        gbizData?: unknown
      }
    | null
}

export function JobCard({
  job,
  isFavorite = false,
  loggedIn = false,
}: {
  job: JobCardProps
  isFavorite?: boolean
  loggedIn?: boolean
}) {
  const tagsToShow = job.tags.slice(0, 5)
  const hasConstructionPermit = computeHasConstructionPermit(
    job.company?.gbizData
  )

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex gap-4 border bg-white p-4 transition hover:border-primary-400 hover:shadow-sm"
    >
      <div className="hidden sm:flex h-10 w-10 shrink-0 items-center justify-center bg-gray-100 group-hover:bg-primary-50 transition">
        <HardHat weight="duotone" className="h-6 w-6 text-primary-500" />
      </div>

      <div className="flex-1 min-w-0">
        {/* メタ: 認定企業バッジ (公共求人側は一覧では非表示、詳細ページ末尾の注記で開示) + カテゴリ + 雇用形態 */}
        <div className="flex items-center gap-2 flex-wrap">
          {job.source === "direct" && (
            <span
              className="inline-flex items-center gap-1 bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800"
              title="掲載企業から直接募集中の認定求人。応募内容は LINE で当社経由で企業に届きます。"
            >
              <SealCheck weight="fill" className="h-3.5 w-3.5" />
              認定企業
            </span>
          )}
          <span className="inline-flex items-center gap-1 bg-primary-100 px-2 py-0.5 text-xs font-medium text-primary-700">
            {getCategoryLabel(job.category)}
          </span>
          {job.employmentType && (
            <span className="bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {employmentTypeLabel(job.employmentType)}
            </span>
          )}
        </div>

        {/* タイトル */}
        <h3 className="mt-1.5 text-base font-semibold text-gray-900 line-clamp-2 group-hover:text-primary-600 transition">
          {job.title}
        </h3>

        {/* 給与・勤務地（重要情報を 1 行で目立たせる） */}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {job.salaryMin ? (
            <span className="inline-flex items-center gap-1 text-lg font-extrabold text-primary-700 tracking-tight">
              <Money weight="fill" className="h-5 w-5 text-primary-500" />
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-sm text-gray-500">
              <Money weight="duotone" className="h-4 w-4" />
              給与応相談
            </span>
          )}
          <span className="inline-flex items-center gap-1 text-sm text-gray-700">
            <MapPin weight="duotone" className="h-4 w-4 text-gray-400" />
            {job.prefecture}
            {job.city && ` ${job.city}`}
          </span>
        </div>

        {/* 会社名（小さく） + 建設業許可バッジ */}
        {job.company && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
            <Buildings weight="duotone" className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{job.company.name}</span>
            {hasConstructionPermit && (
              <span
                className="ml-1 inline-flex shrink-0 items-center gap-0.5 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-xs font-bold text-emerald-700"
                title="GbizINFO で建設業許可を確認済みの企業です"
              >
                <SealCheck weight="fill" className="h-3 w-3" />
                建設業許可
              </span>
            )}
          </p>
        )}

        {/* 構造化バッジ（年間休日 / 保険） */}
        {(job.annualHolidays != null || job.insurance) && (
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
            {job.annualHolidays != null && (
              <span className="inline-flex items-center gap-1">
                <CalendarCheck weight="duotone" className="h-3.5 w-3.5 text-primary-500" />
                年間休日 {job.annualHolidays}日
              </span>
            )}
            {job.insurance && (
              <span className="inline-flex items-center gap-1">
                <ShieldCheck weight="duotone" className="h-3.5 w-3.5 text-primary-500" />
                {truncate(job.insurance, 20)}
              </span>
            )}
          </div>
        )}

        {/* 待遇チップ（自動抽出されたタグを 5 件まで、デザインシステム TagChip 統一）*/}
        {tagsToShow.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {tagsToShow.map((tag) => (
              <TagChip key={tag} size="sm">
                {tag}
              </TagChip>
            ))}
            {job.tags.length > tagsToShow.length && (
              <span className="text-xs text-gray-400 self-center">
                +{job.tags.length - tagsToShow.length}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-end justify-between gap-1 sm:items-center sm:flex-row">
        <JobCardActions>
          <CompareAddButton jobId={job.id} />
          <FavoriteButton
            jobId={job.id}
            initialIsFavorite={isFavorite}
            loggedIn={loggedIn}
          />
        </JobCardActions>
        <CaretRight weight="duotone" className="hidden sm:block h-5 w-5 text-gray-300 group-hover:text-primary-500 transition" />
      </div>
    </Link>
  )
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  const unit = salaryUnitLabel(type)
  // 時給・日給は 1 万未満が大半なので万円表記しない
  const useManYen = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useManYen && n >= 10000
      ? `${(n / 10000).toFixed(0)}万`
      : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  if (min) return `${unit} ${fmt(min)}円〜`
  return ""
}

function salaryUnitLabel(type: string | null): string {
  switch (type) {
    case "hourly":
      return "時給"
    case "annual":
      return "年収"
    case "daily":
      return "日給"
    case "monthly":
    default:
      return "月給"
  }
}

function employmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return labels[type] ?? type
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s
}

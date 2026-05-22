import Link from "next/link"
import { CaretRight, SealCheck } from "@phosphor-icons/react/dist/ssr"
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

/**
 * 求人一覧の 1 行カード。
 *
 * デザイン方針 (マイナビ転職風):
 * - 装飾アイコンを排し、タイポグラフィと色分けチップで情報を整理
 * - 給与は太字 (font-extrabold) で目立たせ、勤務地は普通の文字で
 * - 認定企業 / 公共求人 / カテゴリ / 雇用形態 / 待遇タグを
 *   トーン分けされた色チップで一目で把握できるよう統一
 * - 右端は機能アイコン (お気に入り / 比較) と矢印のみ
 */
export function JobCard({
  job,
  isFavorite = false,
  loggedIn = false,
}: {
  job: JobCardProps
  isFavorite?: boolean
  loggedIn?: boolean
}) {
  const tagsToShow = job.tags.slice(0, 6)
  const hasConstructionPermit = computeHasConstructionPermit(
    job.company?.gbizData
  )

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex gap-3 border border-gray-200 bg-white p-4 transition hover:border-primary-400 hover:shadow-sm sm:gap-4"
    >
      <div className="min-w-0 flex-1">
        {/* タイトル (主役) */}
        <h3 className="text-base font-bold leading-snug text-ink-900 line-clamp-2 group-hover:text-primary-700 sm:text-lg">
          {job.title}
        </h3>

        {/* 給与・勤務地 (重要情報を 1 行で目立たせる) */}
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          {job.salaryMin ? (
            <span className="text-lg font-extrabold tracking-tight text-primary-700 sm:text-xl">
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
            </span>
          ) : (
            <span className="text-sm text-gray-500">給与応相談</span>
          )}
          <span className="text-sm font-medium text-ink-900">
            {job.prefecture}
            {job.city && ` ${job.city}`}
          </span>
        </div>

        {/* 会社名 + 建設業許可バッジ */}
        {job.company && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-600">
            <span className="truncate">{job.company.name}</span>
            {hasConstructionPermit && (
              <span
                className="ml-1 inline-flex shrink-0 items-center gap-0.5 border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700"
                title="GbizINFO で建設業許可を確認済みの企業です"
              >
                <SealCheck weight="fill" className="h-3 w-3" />
                建設業許可
              </span>
            )}
          </p>
        )}

        {/* チップ群 (出典 + カテゴリ + 雇用形態 + 待遇) — マイナビ風カラー分け */}
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {job.source === "direct" ? (
            <TagChip size="sm" tone="new">
              認定企業
            </TagChip>
          ) : (
            <TagChip size="sm" tone="muted">
              公共求人
            </TagChip>
          )}
          <TagChip size="sm" tone="primary">
            {getCategoryLabel(job.category)}
          </TagChip>
          {job.employmentType && (
            <TagChip size="sm" tone="muted">
              {employmentTypeLabel(job.employmentType)}
            </TagChip>
          )}
          {job.annualHolidays != null && job.annualHolidays >= 120 && (
            <TagChip size="sm" tone="featured">
              年間休日 {job.annualHolidays}日
            </TagChip>
          )}
          {tagsToShow.map((tag) => (
            <TagChip key={tag} size="sm" tone={tagTone(tag)}>
              {tag}
            </TagChip>
          ))}
          {job.tags.length > tagsToShow.length && (
            <span className="self-center text-xs text-gray-400">
              +{job.tags.length - tagsToShow.length}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        <JobCardActions>
          <CompareAddButton jobId={job.id} />
          <FavoriteButton
            jobId={job.id}
            initialIsFavorite={isFavorite}
            loggedIn={loggedIn}
          />
        </JobCardActions>
        <CaretRight
          weight="duotone"
          className="hidden h-5 w-5 text-gray-300 group-hover:text-primary-500 sm:block"
        />
      </div>
    </Link>
  )
}

/**
 * 待遇タグの内容から、表示用のトーンを決定する。
 * マイナビ転職的に「色 = 属性カテゴリ」が一目で分かる UX を狙う。
 */
function tagTone(
  tag: string,
): "welcome" | "women" | "experience" | "urgent" | "featured" | "primary" {
  if (/(未経験|学歴不問|新卒|第二新卒|経験不問)/.test(tag)) return "welcome"
  if (/(女性活躍|女性歓迎|ママ)/.test(tag)) return "women"
  if (/(経験者|即戦力|有資格者)/.test(tag)) return "experience"
  if (/(急募|スピード採用)/.test(tag)) return "urgent"
  if (/(高収入|月給\s*\d+万|寮あり|資格手当|完全週休|残業少|ホワイト)/.test(tag))
    return "featured"
  return "primary"
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

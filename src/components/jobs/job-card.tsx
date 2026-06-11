import Link from "next/link"
import { CaretRight, SealCheck } from "@phosphor-icons/react/dist/ssr"
import { getCategoryLabel } from "@/lib/categories"
import { computeHasConstructionPermit } from "@/lib/gbizinfo"
import { pickDefaultJobImage } from "@/lib/default-job-images"
import { parseVideoUrls } from "@/lib/video-embed"
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
  /** 公開日時。直近なら「NEW」バッジを出す（時系列ハイライト） */
  publishedAt?: Date | string | null
  /** メイン写真。先頭をアイキャッチに使う。無ければ既定画像へフォールバック */
  imageUrls?: string[]
  /** 動画・SNS URL。TikTok / Instagram があればカードにロゴを表示する */
  videoUrls?: string[]
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
 * 求人一覧のカード。
 *
 * variant:
 * - "row"  (既定): 1 行の横長カード。情報密度を重視（マイナビ転職風）。
 * - "grid": 上部にアイキャッチ画像を載せた縦型カード（Wantedly 風）。
 *           複数列グリッドでの表示を想定。
 *
 * デザイン方針 (マイナビ転職風):
 * - 装飾アイコンを排し、タイポグラフィと色分けチップで情報を整理
 * - 給与は太字 (font-extrabold) で目立たせ、勤務地は普通の文字で
 * - 認定企業 / 公共求人 / カテゴリ / 雇用形態 / 待遇タグを
 *   トーン分けされた色チップで一目で把握できるよう統一
 */
export function JobCard({
  job,
  isFavorite = false,
  loggedIn = false,
  variant = "row",
}: {
  job: JobCardProps
  isFavorite?: boolean
  loggedIn?: boolean
  variant?: "row" | "grid"
}) {
  const tagsToShow = job.tags.slice(0, 6)
  const hasConstructionPermit = computeHasConstructionPermit(
    job.company?.gbizData
  )

  // 時系列ハイライト: 公開から 7 日以内は NEW、タグに急募系があれば 急募。
  // サーバーレンダリング時に相対時刻で判定する（意図的な現在時刻参照）。
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now()
  const isNew = job.publishedAt
    ? nowMs - new Date(job.publishedAt).getTime() < 7 * 86_400_000
    : false
  const isUrgent = job.tags.some((t) => /急募|即日|スピード採用/.test(t))

  const actions = (
    <JobCardActions>
      <CompareAddButton jobId={job.id} />
      <FavoriteButton
        jobId={job.id}
        initialIsFavorite={isFavorite}
        loggedIn={loggedIn}
      />
    </JobCardActions>
  )

  // 共通の本文（タイトル・給与・会社名・チップ）。row/grid で使い回す。
  const body = (
    <>
      {/* 時系列バッジ（NEW / 急募） */}
      {(isNew || isUrgent) && (
        <div className="mb-1 flex flex-wrap gap-1">
          {isNew && (
            <span className="inline-flex items-center bg-rose-500 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
              NEW
            </span>
          )}
          {isUrgent && (
            <span className="inline-flex items-center bg-orange-600 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide text-white">
              急募
            </span>
          )}
        </div>
      )}

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

      {/* チップ群 (認定企業 + カテゴリ + 雇用形態 + 待遇) — マイナビ風カラー分け。
          公共求人 (HW) チップは一覧では非表示、詳細ページ末尾の注記でのみ開示。*/}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {job.source === "direct" && (
          <TagChip size="sm" tone="new">
            認定企業
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
    </>
  )

  if (variant === "grid") {
    // メイン写真があればそれを、無ければ求人 ID から既定画像を決定的に選ぶ
    const eyecatch = job.imageUrls?.[0] ?? pickDefaultJobImage(job.id)
    return (
      <Link
        href={`/jobs/${job.id}`}
        className="group flex flex-col overflow-hidden border border-gray-200 bg-white transition hover:border-primary-400 hover:shadow-md"
      >
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-ink-900">
          {eyecatch ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={eyecatch}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold tracking-[0.25em] text-white/90">
                {getCategoryLabel(job.category)}
              </span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-1 bg-brand-yellow-500" />
          {job.source === "direct" && (
            <span className="absolute left-2 top-2 bg-primary-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
              認定企業
            </span>
          )}
          <SnsBadges videoUrls={job.videoUrls} />
          <div className="absolute right-2 top-2">{actions}</div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col p-4">{body}</div>
      </Link>
    )
  }

  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group flex gap-3 border border-gray-200 bg-white p-4 transition hover:border-primary-400 hover:shadow-sm sm:gap-4"
    >
      <div className="min-w-0 flex-1">{body}</div>

      <div className="flex shrink-0 flex-col items-end justify-between gap-2">
        {actions}
        <CaretRight
          weight="duotone"
          className="hidden h-5 w-5 text-gray-300 group-hover:text-primary-500 sm:block"
        />
      </div>
    </Link>
  )
}

/**
 * 求人が持つ動画 URL から TikTok / Instagram のロゴバッジを描画する。
 * アイキャッチ画像の上に重ねて「SNS 投稿あり」を一目で示す。
 */
function SnsBadges({ videoUrls }: { videoUrls?: string[] }) {
  if (!videoUrls || videoUrls.length === 0) return null
  const providers = new Set(parseVideoUrls(videoUrls).map((v) => v.provider))
  const hasTiktok = providers.has("tiktok")
  const hasInstagram = providers.has("instagram")
  if (!hasTiktok && !hasInstagram) return null
  return (
    <div className="absolute bottom-2 left-2 flex gap-1">
      {hasTiktok && (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-black text-white shadow"
          title="TikTok 動画あり"
          aria-label="TikTok 動画あり"
        >
          <TiktokIcon />
        </span>
      )}
      {hasInstagram && (
        <span
          className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600 text-white shadow"
          title="Instagram 投稿あり"
          aria-label="Instagram 投稿あり"
        >
          <InstagramIcon />
        </span>
      )}
    </div>
  )
}

function TiktokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5" aria-hidden>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V7.51a8.16 8.16 0 0 0 4.78 1.55v-3.44a4.85 4.85 0 0 1-1-.93z" />
    </svg>
  )
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
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

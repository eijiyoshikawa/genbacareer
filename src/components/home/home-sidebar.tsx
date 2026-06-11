import Link from "next/link"
import Image from "next/image"
import { CaretRight } from "@phosphor-icons/react/dist/ssr"
import { pickDefaultJobImage } from "@/lib/default-job-images"

type SidebarJob = {
  id: string
  title: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  imageUrls?: string[]
  company: { name: string } | null
}

type SidebarArticle = {
  slug: string
  title: string
  publishedAt: Date | null
  imageUrl: string | null
}

type Announcement = {
  /** YYYY-MM-DD */
  date: string
  label: string
  /** 任意のリンク先 */
  href?: string
}

/**
 * トップページ PC 用サイドバー。
 *
 * 注目求人 ミニリスト / お知らせ / インタビュー記事 を縦に並べる。
 * SP では non-rendered (親側で hidden lg:block 制御推奨)。
 */
export function HomeSidebar({
  featuredJobs,
  interviewArticles,
  announcements,
}: {
  featuredJobs: SidebarJob[]
  interviewArticles: SidebarArticle[]
  announcements: Announcement[]
}) {
  return (
    <aside className="space-y-6">
      {/* === 注目求人 ミニリスト === */}
      {featuredJobs.length > 0 && (
        <section className="card p-4">
          <div className="flex items-end justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              注目求人
            </h3>
            <Link
              href="/jobs"
              className="text-[11px] font-bold text-primary-600 hover:text-primary-700"
            >
              一覧 →
            </Link>
          </div>
          <ul className="space-y-2">
            {featuredJobs.slice(0, 7).map((j) => {
              const thumb = j.imageUrls?.[0] ?? pickDefaultJobImage(j.id)
              return (
                <li key={j.id}>
                  <Link
                    href={`/jobs/${j.id}`}
                    className="press card-flat block overflow-hidden"
                  >
                    {thumb && (
                      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gray-100">
                        <Image
                          src={thumb}
                          alt=""
                          fill
                          sizes="260px"
                          className="object-cover"
                          unoptimized={
                            !thumb.startsWith("/") &&
                            !thumb.includes("supabase.co")
                          }
                        />
                      </div>
                    )}
                    <div className="p-3">
                      <p className="text-xs font-bold text-gray-900 line-clamp-2">
                        {j.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-gray-500">
                        {j.company && (
                          <span className="truncate max-w-[140px]">
                            {j.company.name}
                          </span>
                        )}
                        <span>
                          {j.prefecture}
                          {j.city ? ` ${j.city}` : ""}
                        </span>
                      </div>
                      {j.salaryMin && (
                        <p className="mt-1 text-xs font-bold text-primary-700">
                          {formatSalaryShort(
                            j.salaryMin,
                            j.salaryMax,
                            j.salaryType,
                          )}
                        </p>
                      )}
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {/* === お知らせ === */}
      {announcements.length > 0 && (
        <section className="card p-4">
          <h3 className="text-sm font-bold text-gray-900 mb-3">
            お知らせ
          </h3>
          <ul className="space-y-2">
            {announcements.slice(0, 5).map((a, i) => (
              <li key={i}>
                {a.href ? (
                  <Link
                    href={a.href}
                    className="press group flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-b-0"
                  >
                    <span className="text-[11px] font-mono text-gray-400 shrink-0 pt-0.5">
                      {a.date}
                    </span>
                    <span className="flex-1 text-xs text-gray-700 group-hover:text-primary-700 leading-snug">
                      {a.label}
                    </span>
                    <CaretRight
                      weight="bold"
                      className="h-3 w-3 text-gray-300 group-hover:text-primary-600 shrink-0 mt-1"
                    />
                  </Link>
                ) : (
                  <div className="flex items-start gap-2 py-1.5 border-b border-gray-100 last:border-b-0">
                    <span className="text-[11px] font-mono text-gray-400 shrink-0 pt-0.5">
                      {a.date}
                    </span>
                    <span className="flex-1 text-xs text-gray-700 leading-snug">
                      {a.label}
                    </span>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* === 現場インタビュー === */}
      {interviewArticles.length > 0 && (
        <section className="card p-4">
          <div className="flex items-end justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">
              現場インタビュー
            </h3>
            <Link
              href="/journal?category=interview"
              className="text-[11px] font-bold text-primary-600 hover:text-primary-700"
            >
              一覧 →
            </Link>
          </div>
          <ul className="space-y-3">
            {interviewArticles.slice(0, 5).map((a) => (
              <li key={a.slug}>
                <Link
                  href={`/journal/${a.slug}`}
                  className="press group flex gap-3"
                >
                  <div className="relative h-14 w-20 shrink-0 overflow-hidden bg-gray-100">
                    {a.imageUrl ? (
                      <Image
                        src={a.imageUrl}
                        alt={a.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                        unoptimized={
                          !a.imageUrl.startsWith("/") &&
                          !a.imageUrl.includes("supabase.co")
                        }
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-gray-900 line-clamp-3 group-hover:text-primary-700 leading-snug">
                      {a.title}
                    </p>
                    {a.publishedAt && (
                      <p className="mt-1 text-[10px] text-gray-400">
                        {new Date(a.publishedAt).toLocaleDateString("ja-JP")}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </aside>
  )
}

function formatSalaryShort(
  min: number | null,
  max: number | null,
  type: string | null,
): string {
  if (!min) return ""
  const unit =
    type === "hourly"
      ? "時給"
      : type === "annual"
        ? "年収"
        : type === "daily"
          ? "日給"
          : "月給"
  const useManYen = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useManYen && n >= 10000
      ? `${(n / 10000).toFixed(0)}万`
      : `${n.toLocaleString()}`
  if (max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  return `${unit} ${fmt(min)}円〜`
}

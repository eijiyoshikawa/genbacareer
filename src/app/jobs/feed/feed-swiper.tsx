"use client"

/**
 * 縦スワイプ求人フィード (11.5)。
 *
 * scroll-snap を使った 1 画面 1 求人の縦スクロール UI。
 * 末尾近くまでスクロールしたら IntersectionObserver で追加 fetch。
 *
 * - 上下スワイプ = 次/前の求人
 * - 各カードに 応募・お気に入り・詳細 のオーバーレイ
 * - フッタ Header は layout で隠れないので、フィードは hidden に
 *   できないがフルスクリーン感を出すため black 背景にしている
 */

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Heart, MessageCircle, MapPin, Briefcase, ExternalLink, ChevronUp } from "lucide-react"
import { getCategoryLabel } from "@/lib/categories"

export interface FeedJob {
  id: string
  title: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  employmentType: string | null
  category: string
  tags: string[]
  description: string | null
  companyName: string | null
  companyLogoUrl: string | null
  companyPhoto: string | null
}

function formatSalary(j: FeedJob): string {
  if (!j.salaryMin) return "応相談"
  const unit =
    j.salaryType === "hourly" ? "円/時" : j.salaryType === "annual" ? "万円/年" : "円/月"
  const div = j.salaryType === "annual" ? 10_000 : 1
  if (j.salaryMax && j.salaryMax > j.salaryMin) {
    return `${(j.salaryMin / div).toLocaleString()}〜${(j.salaryMax / div).toLocaleString()} ${unit}`
  }
  return `${(j.salaryMin / div).toLocaleString()} ${unit}〜`
}

export function FeedSwiper({ initialJobs }: { initialJobs: FeedJob[] }) {
  const [jobs, setJobs] = useState<FeedJob[]>(initialJobs)
  const [loading, setLoading] = useState(false)
  const [exhausted, setExhausted] = useState(false)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // 追加読み込み
  const loadMore = useCallback(async () => {
    if (loading || exhausted) return
    const last = jobs[jobs.length - 1]
    if (!last) return
    setLoading(true)
    try {
      const res = await fetch(`/api/jobs/feed?cursor=${last.id}`)
      if (!res.ok) {
        setExhausted(true)
        return
      }
      const data = (await res.json()) as { jobs: FeedJob[] }
      if (data.jobs.length === 0) {
        setExhausted(true)
      } else {
        setJobs((prev) => [...prev, ...data.jobs])
      }
    } catch {
      setExhausted(true)
    } finally {
      setLoading(false)
    }
  }, [loading, exhausted, jobs])

  // IntersectionObserver: 最後から 3 枚以内に来たら次を読み込み
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) loadMore()
        }
      },
      { root: containerRef.current, threshold: 0.5 }
    )
    io.observe(node)
    return () => io.disconnect()
  }, [loadMore])

  async function toggleFavorite(jobId: string) {
    const isFav = favorites.has(jobId)
    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFav) next.delete(jobId)
      else next.add(jobId)
      return next
    })
    try {
      await fetch(`/api/users/me/favorites/${jobId}`, {
        method: isFav ? "DELETE" : "POST",
      })
    } catch {
      // 楽観的更新を巻き戻す
      setFavorites((prev) => {
        const next = new Set(prev)
        if (isFav) next.add(jobId)
        else next.delete(jobId)
        return next
      })
    }
  }

  if (jobs.length === 0) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center text-white">
        <p>表示できる求人がありません</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="h-[calc(100vh-4rem)] overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      style={{ scrollbarWidth: "none" }}
      aria-label="求人フィード"
    >
      {jobs.map((j, idx) => (
        <FeedCard
          key={j.id}
          job={j}
          isFavorite={favorites.has(j.id)}
          onFavorite={() => toggleFavorite(j.id)}
          showHint={idx === 0}
        />
      ))}
      {/* 末尾 3 枚手前で次の読み込みをトリガー */}
      <div ref={sentinelRef} className="h-1" />
      {loading && (
        <div className="snap-start flex h-[calc(100vh-4rem)] items-center justify-center text-white">
          <p>読み込み中...</p>
        </div>
      )}
      {exhausted && (
        <div className="snap-start flex h-[calc(100vh-4rem)] flex-col items-center justify-center gap-4 text-white">
          <p>すべての求人を表示しました</p>
          <Link
            href="/jobs"
            className="border border-white px-4 py-2 text-sm hover:bg-white hover:text-black"
          >
            一覧画面に戻る
          </Link>
        </div>
      )}
    </div>
  )
}

function FeedCard({
  job,
  isFavorite,
  onFavorite,
  showHint,
}: {
  job: FeedJob
  isFavorite: boolean
  onFavorite: () => void
  showHint: boolean
}) {
  return (
    <article className="snap-start h-[calc(100vh-4rem)] relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      {/* 背景画像 */}
      {job.companyPhoto && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={job.companyPhoto}
          alt=""
          className="absolute inset-0 h-full w-full object-cover opacity-40"
          loading="lazy"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {/* 本文 */}
      <div className="relative z-10 flex h-full flex-col justify-end p-6 pb-24">
        <div className="space-y-3">
          {/* 企業 */}
          <div className="flex items-center gap-2">
            {job.companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={job.companyLogoUrl}
                alt=""
                className="h-8 w-8 border border-white/20 object-contain bg-white"
              />
            ) : (
              <div className="h-8 w-8 border border-white/20 bg-white/10" />
            )}
            <p className="text-sm font-medium">{job.companyName ?? "企業名非公開"}</p>
          </div>

          <h2 className="text-xl font-bold leading-tight line-clamp-3">
            {job.title}
          </h2>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-200">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.prefecture}
              {job.city ? ` / ${job.city}` : ""}
            </span>
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3.5 w-3.5" />
              {getCategoryLabel(job.category)}
            </span>
          </div>

          <p className="text-2xl font-extrabold text-primary-300">
            {formatSalary(job)}
          </p>

          {job.description && (
            <p className="text-sm text-gray-200 line-clamp-3 leading-relaxed">
              {job.description}
            </p>
          )}

          {job.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {job.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="bg-white/15 px-2 py-0.5 text-[10px] font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 右下フローティング アクション */}
      <div className="absolute bottom-6 right-4 z-20 flex flex-col gap-3">
        <button
          type="button"
          onClick={onFavorite}
          aria-label={isFavorite ? "お気に入りから削除" : "お気に入りに追加"}
          aria-pressed={isFavorite}
          className={`flex h-12 w-12 items-center justify-center border-2 backdrop-blur-sm transition ${
            isFavorite
              ? "border-red-500 bg-red-500/90 text-white"
              : "border-white/50 bg-black/30 text-white hover:bg-white/20"
          }`}
        >
          <Heart className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} />
        </button>
        <Link
          href={`/jobs/${job.id}/apply`}
          aria-label="応募する"
          className="flex h-12 w-12 items-center justify-center border-2 border-primary-400 bg-primary-500 text-white hover:bg-primary-600"
        >
          <MessageCircle className="h-5 w-5" />
        </Link>
        <Link
          href={`/jobs/${job.id}`}
          aria-label="詳細を見る"
          className="flex h-12 w-12 items-center justify-center border-2 border-white/50 bg-black/30 text-white backdrop-blur-sm hover:bg-white/20"
        >
          <ExternalLink className="h-5 w-5" />
        </Link>
      </div>

      {/* 初回ヒント */}
      {showHint && (
        <div className="pointer-events-none absolute left-1/2 top-6 z-20 -translate-x-1/2 animate-bounce text-center text-white">
          <ChevronUp className="mx-auto h-6 w-6" />
          <p className="text-xs">上にスワイプで次へ</p>
        </div>
      )}
    </article>
  )
}

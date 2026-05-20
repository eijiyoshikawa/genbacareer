"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Sparkle, Money, MapPin } from "@phosphor-icons/react/dist/ssr"
import { JobCardSkeletonGrid } from "@/components/ui/skeleton"
import { getCategoryLabel } from "@/lib/categories"

type RecommendedJob = {
  id: string
  title: string
  category: string
  prefecture: string
  city: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  employmentType: string | null
  source: string
  tags: string[]
  company: {
    name: string
    logoUrl: string | null
    /** GbizINFO JSONB（あれば建設業許可バッジ表示） */
    gbizData?: unknown
  } | null
}

/**
 * トップページなど ISR キャッシュされたページに、クライアント fetch で
 * パーソナライズおすすめを差し込むセクション。
 *
 * - 初回マウント時に `/api/recommendations?limit=N` を叩く
 * - サーバー側で gc_sid Cookie を読むため、匿名ユーザーでも閲覧履歴から
 *   推薦が出る
 * - personalized: false（履歴ゼロ）の場合は出さない（SSR 側の人気枠と重複させない）
 * - エラー時はサイレントに非表示
 *
 * 表示は「タイトル + 給与 + カテゴリ + 勤務地」のみに絞った縦 2 列の
 * ミニカード。
 */
export function RecommendedForYou({
  limit = 6,
  alwaysShow = false,
}: {
  limit?: number
  alwaysShow?: boolean
}) {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "ready"; jobs: RecommendedJob[]; personalized: boolean }
    | { kind: "error" }
  >({ kind: "loading" })

  useEffect(() => {
    const ctrl = new AbortController()
    // INP 保護: API 応答が 2 秒以上かかったら諦めて非表示にし、
    // メインスレッドのアイドル時間を確保する。
    const timeoutId = setTimeout(() => ctrl.abort(), 2000)

    fetch(`/api/recommendations?limit=${limit}`, {
      credentials: "same-origin",
      signal: ctrl.signal,
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => {
        setState({
          kind: "ready",
          jobs: data.jobs ?? [],
          personalized: !!data.personalized,
        })
      })
      .catch(() => {
        setState({ kind: "error" })
      })
      .finally(() => {
        clearTimeout(timeoutId)
      })
    return () => {
      clearTimeout(timeoutId)
      ctrl.abort()
    }
  }, [limit])

  if (state.kind === "error") return null

  if (state.kind === "loading") {
    return (
      <section>
        <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900 section-bar">
          あなたへのおすすめ求人
        </h2>
        <div className="mt-4">
          <JobCardSkeletonGrid count={Math.min(4, limit)} cols="sm:grid-cols-2" />
        </div>
      </section>
    )
  }

  // ログイン無し + 閲覧履歴も無い → 出さない（SSR 側の人気枠と重複するため）
  if (!alwaysShow && !state.personalized) return null
  if (state.jobs.length === 0) return null

  return (
    <section>
      <h2 className="flex items-center gap-2 text-xl sm:text-2xl font-bold text-gray-900 section-bar">
        <Sparkle weight="fill" className="h-5 w-5 text-amber-500" />
        あなたへのおすすめ求人
      </h2>
      <p className="mt-1 text-xs text-gray-500">
        {state.personalized
          ? "閲覧履歴・お気に入りから、興味に合いそうな求人を選んでいます。"
          : "建設業の注目求人です。"}
      </p>
      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {state.jobs.slice(0, limit).map((job) => (
          <MinimalJobCard key={job.id} job={job} />
        ))}
      </div>
    </section>
  )
}

/**
 * 情報量を最小限に絞った求人ミニカード。
 *
 * 表示するのは:
 * - カテゴリラベル (バッジ)
 * - 求人タイトル
 * - 給与レンジ
 * - 勤務地 (都道府県 + 市区)
 *
 * 企業名 / 雇用形態 / タグ / お気に入り操作などは省略。
 */
function MinimalJobCard({ job }: { job: RecommendedJob }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="press card group block p-3.5"
    >
      <span className="inline-block bg-primary-50 text-primary-700 px-2 py-0.5 text-[10px] font-bold">
        {getCategoryLabel(job.category)}
      </span>
      <h3 className="mt-2 text-sm font-bold text-gray-900 line-clamp-2 leading-snug group-hover:text-primary-700">
        {job.title}
      </h3>
      {job.salaryMin && (
        <p className="mt-2 inline-flex items-center gap-1 text-sm font-extrabold text-primary-700">
          <Money weight="duotone" className="h-4 w-4" />
          {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
        </p>
      )}
      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500">
        <MapPin weight="duotone" className="h-3.5 w-3.5" />
        {job.prefecture}
        {job.city ? ` ${job.city}` : ""}
      </p>
    </Link>
  )
}

function formatSalary(
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
    useManYen && n >= 10000 ? `${(n / 10000).toFixed(0)}万` : n.toLocaleString()
  if (max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  return `${unit} ${fmt(min)}円〜`
}

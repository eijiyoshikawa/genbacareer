/**
 * 12.6 企業ランキング (業界別 / 地域別)。
 *
 * 公開求人数 × 2 + フォロワー数 × 3 + 応募数 × 1 を簡易スコアとして
 * 集計し、業界別 / 地域別の上位 10 社を表示する。
 * Phase 2 では別途バッチで Company.rankScore 列を導入し、
 * 集計済み値を使う方が高速だが、まずは on-the-fly で動作させる。
 */

import { prisma } from "@/lib/db"
import Link from "next/link"
import type { Metadata } from "next"
import { CATEGORIES } from "@/lib/categories"
import { PREFECTURES } from "@/lib/constants"

export const metadata: Metadata = {
  title: "企業ランキング",
  description:
    "建設業界の人気企業ランキング。求人数・フォロワー数・応募数から総合スコアを算出。業界別 / 地域別で絞り込み可能。",
  alternates: { canonical: "/companies/ranking" },
  openGraph: {
    title: "建設業 企業ランキング | ゲンバキャリア",
    description:
      "求人数 × フォロワー数 × 応募数で算出した建設業の人気企業 TOP 10。",
  },
}

// ビルド時 prerender をスキップ (P2024 回避)。
// /jobs/map / /jobs/feed / sitemap.ts と同じ build 時接続枯渇問題への対応。
// 6h ISR は意図したキャッシュ運用 (ランキングが秒単位で更新される必要なし) なので
// revalidate 自体は残すが、force-dynamic で build 時 prerender を抑止。
export const dynamic = "force-dynamic"
export const revalidate = 21600

type SearchParams = Promise<{ industry?: string; pref?: string; tab?: string }>

interface RankedCompany {
  id: string
  name: string
  industry: string | null
  prefecture: string | null
  logoUrl: string | null
  tagline: string | null
  publishedJobs: number
  followers: number
  applications: number
  score: number
}

async function aggregateRanking(opts: {
  industry?: string
  prefecture?: string
}): Promise<RankedCompany[]> {
  const companies = await prisma.company.findMany({
    where: {
      status: "approved",
      ...(opts.industry ? { industry: opts.industry } : {}),
      ...(opts.prefecture ? { prefecture: opts.prefecture } : {}),
    },
    select: {
      id: true,
      name: true,
      industry: true,
      prefecture: true,
      logoUrl: true,
      tagline: true,
      _count: {
        select: {
          jobs: { where: { status: "active" } },
          followers: true,
          applications: true,
        },
      },
    },
    take: 200, // 集計上限。スコア降順 in-memory ソート用
  })

  const ranked: RankedCompany[] = companies
    .map((c) => {
      const publishedJobs = c._count.jobs
      const followers = c._count.followers
      const applications = c._count.applications
      const score = publishedJobs * 2 + followers * 3 + applications
      return {
        id: c.id,
        name: c.name,
        industry: c.industry,
        prefecture: c.prefecture,
        logoUrl: c.logoUrl,
        tagline: c.tagline,
        publishedJobs,
        followers,
        applications,
        score,
      }
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return ranked
}

export default async function CompanyRankingPage(props: {
  searchParams: SearchParams
}) {
  const { industry, pref, tab } = await props.searchParams
  const activeTab = tab === "prefecture" ? "prefecture" : "industry"

  const ranked = await aggregateRanking({
    industry: industry || undefined,
    prefecture: pref || undefined,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        企業ランキング
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
        求人数 × 2 + フォロワー数 × 3 + 応募数 × 1 で算出した人気企業ランキング。
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200 dark:border-gray-800">
        <Link
          href="/companies/ranking?tab=industry"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "industry"
              ? "border-primary-600 text-primary-700 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          業界別
        </Link>
        <Link
          href="/companies/ranking?tab=prefecture"
          className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
            activeTab === "prefecture"
              ? "border-primary-600 text-primary-700 dark:text-primary-400"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          地域別
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {activeTab === "industry" ? (
          <>
            <Link
              href="/companies/ranking?tab=industry"
              className={`border px-3 py-1 text-xs ${
                !industry
                  ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              全業界
            </Link>
            {CATEGORIES.map((c) => (
              <Link
                key={c.value}
                href={`/companies/ranking?tab=industry&industry=${c.value}`}
                className={`border px-3 py-1 text-xs ${
                  industry === c.value
                    ? "border-primary-500 bg-primary-50 text-primary-700 dark:bg-primary-900/30"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                {c.label}
              </Link>
            ))}
          </>
        ) : (
          <>
            <Link
              href="/companies/ranking?tab=prefecture"
              className={`border px-3 py-1 text-xs ${
                !pref
                  ? "border-primary-500 bg-primary-50 text-primary-700"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              }`}
            >
              全国
            </Link>
            {PREFECTURES.map((p) => (
              <Link
                key={p}
                href={`/companies/ranking?tab=prefecture&pref=${encodeURIComponent(p)}`}
                className={`border px-3 py-1 text-xs ${
                  pref === p
                    ? "border-primary-500 bg-primary-50 text-primary-700"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
                }`}
              >
                {p}
              </Link>
            ))}
          </>
        )}
      </div>

      <ol className="mt-6 space-y-3">
        {ranked.length === 0 ? (
          <li className="border bg-white dark:bg-gray-900 p-8 text-center text-sm text-gray-500">
            該当する企業が見つかりません。
          </li>
        ) : (
          ranked.map((c, idx) => (
            <li
              key={c.id}
              className="border bg-white dark:bg-gray-900 dark:border-gray-800 p-4 shadow-sm"
            >
              <Link
                href={`/companies/${c.id}`}
                className="flex items-start gap-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center bg-primary-500 text-lg font-bold text-white">
                  {idx + 1}
                </div>
                {c.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={c.logoUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 border object-contain"
                  />
                ) : (
                  <div className="h-12 w-12 shrink-0 border bg-gray-100 dark:bg-gray-800" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900 dark:text-gray-100">
                    {c.name}
                  </p>
                  {c.tagline && (
                    <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                      {c.tagline}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <span>公開求人: {c.publishedJobs}</span>
                    <span>フォロワー: {c.followers}</span>
                    <span>応募: {c.applications}</span>
                    <span className="font-medium text-primary-700 dark:text-primary-400">
                      スコア: {c.score}
                    </span>
                  </div>
                </div>
              </Link>
            </li>
          ))
        )}
      </ol>
    </div>
  )
}

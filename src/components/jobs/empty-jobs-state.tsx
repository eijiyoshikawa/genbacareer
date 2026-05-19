import Link from "next/link"
import { Search, Sparkles, RefreshCcw } from "lucide-react"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { CONSTRUCTION_CATEGORY_VALUES, getCategoryLabel } from "@/lib/categories"

type Props = {
  /** 現在の検索クエリ（条件を緩めるサジェスト生成に使う） */
  params: {
    q?: string
    category?: string
    prefecture?: string
    city?: string
    employment_type?: string
  }
  /** お気に入り判定用 */
  favoriteIds: Set<string>
  loggedIn: boolean
}

/** 全カテゴリのうち、現在指定カテゴリを除く 4 件をサジェスト用に返す */
function suggestOtherCategories(current?: string): string[] {
  return CONSTRUCTION_CATEGORY_VALUES.filter((c) => c !== current).slice(0, 4)
}

/**
 * 検索結果 0 件のときの表示。
 *
 * - 「条件を緩める」サジェスト（都道府県外す / カテゴリ外す / フリーワード外す）
 * - 人気カテゴリのチップ
 * - 直近 6 件の新着求人（フィルタなし）
 *
 * すべて SSR で取得するので Skeleton 不要。
 */
export async function EmptyJobsState({ params, favoriteIds, loggedIn }: Props) {
  // 軽量な「最新求人」フェッチ（全フィルタを外して 6 件のみ）
  const latestJobs = await prisma.job.findMany({
    where: {
      status: "active",
      category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
    },
    orderBy: { publishedAt: "desc" },
    take: 6,
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
          tagline: true,
          gbizData: true,
        },
      },
    },
  })

  // 「条件を緩める」サジェストのリンクを生成
  const relaxLinks: Array<{ label: string; href: string }> = []
  const baseSearchEntries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== ""
  )

  if (params.prefecture) {
    const sp = new URLSearchParams(
      baseSearchEntries.filter(([k]) => k !== "prefecture") as [string, string][]
    )
    relaxLinks.push({
      label: `「${params.prefecture}」を外して検索`,
      href: `/jobs${sp.toString() ? `?${sp.toString()}` : ""}`,
    })
  }
  if (params.category) {
    const sp = new URLSearchParams(
      baseSearchEntries.filter(([k]) => k !== "category") as [string, string][]
    )
    relaxLinks.push({
      label: `「${getCategoryLabel(params.category)}」を外して検索`,
      href: `/jobs${sp.toString() ? `?${sp.toString()}` : ""}`,
    })
  }
  if (params.q) {
    const sp = new URLSearchParams(
      baseSearchEntries.filter(([k]) => k !== "q") as [string, string][]
    )
    relaxLinks.push({
      label: `キーワード「${params.q}」を外して検索`,
      href: `/jobs${sp.toString() ? `?${sp.toString()}` : ""}`,
    })
  }
  if (params.employment_type) {
    const sp = new URLSearchParams(
      baseSearchEntries.filter(
        ([k]) => k !== "employment_type"
      ) as [string, string][]
    )
    relaxLinks.push({
      label: "雇用形態の指定を外して検索",
      href: `/jobs${sp.toString() ? `?${sp.toString()}` : ""}`,
    })
  }

  const otherCategories = suggestOtherCategories(params.category)

  return (
    <div className="space-y-6">
      {/* メイン NO RESULTS パネル */}
      <div className="border bg-white p-8 sm:p-12 text-center">
        <Search className="mx-auto h-10 w-10 text-gray-300" />
        <p className="mt-3 text-base font-bold text-gray-900">
          条件に合う求人が見つかりませんでした
        </p>
        <p className="mt-2 text-sm text-gray-500">
          検索条件を緩めると、近い求人が見つかるかもしれません。
        </p>

        {/* 条件を緩めるサジェスト */}
        {relaxLinks.length > 0 && (
          <ul className="mt-5 flex flex-col items-center gap-2">
            {relaxLinks.map((link) => (
              <li key={link.label}>
                <Link
                  href={link.href}
                  className="press inline-flex items-center gap-1.5 border border-primary-200 bg-primary-50 px-3 py-1.5 text-sm font-bold text-primary-700 hover:bg-primary-100 transition"
                >
                  <RefreshCcw className="h-3.5 w-3.5" />
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}

        {/* 他カテゴリのチップ */}
        {otherCategories.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-bold text-gray-500">他の職種を見る</p>
            <ul className="mt-2 flex flex-wrap items-center justify-center gap-2">
              {otherCategories.map((c) => (
                <li key={c}>
                  <Link
                    href={`/jobs?category=${c}`}
                    className="press inline-block border border-gray-300 bg-white px-3 py-1 text-xs font-bold text-gray-700 hover:border-primary-400 hover:bg-primary-50 hover:text-primary-700 transition"
                  >
                    {getCategoryLabel(c)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-6 text-xs text-gray-500">
          全国の公共求人もあわせて{" "}
          <Link href="/hw-jobs" className="text-primary-700 underline underline-offset-2 hover:no-underline">
            こちら
          </Link>{" "}
          から検索できます
        </p>
      </div>

      {/* 最新求人 */}
      {latestJobs.length > 0 && (
        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
            <Sparkles className="h-4 w-4 text-primary-500" />
            最新の求人
          </h3>
          <div className="space-y-3">
            {latestJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                isFavorite={favoriteIds.has(job.id)}
                loggedIn={loggedIn}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

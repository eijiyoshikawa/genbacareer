import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Bookmark, Search, ArrowLeftRight } from "lucide-react"
import type { Metadata } from "next"
import { Suspense } from "react"
import { JobCard } from "@/components/jobs/job-card"
import { JobCardSkeletonGrid } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "お気に入り",
  robots: { index: false, follow: false },
}

const MAX_COMPARE = 4

export default async function FavoritesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login?callbackUrl=/mypage/favorites")

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bookmark className="h-6 w-6 text-amber-500" />
            お気に入り
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            気になる求人を保存して、後でじっくり比較できます。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/jobs"
            className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-bold text-white"
          >
            <Search className="h-4 w-4" />
            求人を探す
          </Link>
        </div>
      </div>

      <Suspense fallback={<JobCardSkeletonGrid count={4} cols="sm:grid-cols-2" />}>
        <FavoritesList userId={session.user.id} />
      </Suspense>
    </div>
  )
}

async function FavoritesList({ userId }: { userId: string }) {
  // JobCard で必要なカラムだけ select する。Job.rawData (Json 丸ごと) などを
  // 引かないことで TTFB を短縮。
  const favorites = await prisma.jobFavorite
    .findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        jobId: true,
        job: {
          select: {
            id: true,
            title: true,
            status: true,
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
            company: {
              select: { name: true, logoUrl: true, gbizData: true },
            },
          },
        },
      },
    })
    .catch(() => [])

  const items = favorites.filter((f) => f.job)

  const compareIds = items.slice(0, MAX_COMPARE).map((f) => f.jobId)
  const compareHref =
    compareIds.length >= 2
      ? `/jobs/compare?ids=${compareIds.join(",")}`
      : null

  if (items.length === 0) {
    return (
      <div className="mt-8 border bg-white p-10 text-center text-sm text-gray-600 space-y-3">
        <p>まだお気に入りはありません。</p>
        <p className="text-xs text-gray-500">
          求人カードの 🔖 アイコンをタップすると、ここに保存されます。
        </p>
      </div>
    )
  }

  return (
    <>
      {compareHref && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href={compareHref}
            className="press inline-flex items-center gap-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 px-3 py-2 text-sm font-bold text-amber-800"
            title={`お気に入りの最新 ${compareIds.length} 件を横並びで比較`}
          >
            <ArrowLeftRight className="h-4 w-4" />
            全部比較（{compareIds.length} 件）
          </Link>
          {items.length >= 2 &&
            compareIds.length === MAX_COMPARE &&
            items.length > MAX_COMPARE && (
              <span className="text-[11px] text-gray-500">
                ※ 比較は最新の {MAX_COMPARE} 件まで。他の求人は外して比較し直してください。
              </span>
            )}
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        {items.map((f) => (
          <JobCard key={f.jobId} job={f.job!} />
        ))}
      </div>
    </>
  )
}

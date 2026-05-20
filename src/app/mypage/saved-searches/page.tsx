import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Bookmark, Search } from "lucide-react"
import type { Metadata } from "next"
import { formatSearchLabel, toSearchQueryString } from "@/lib/saved-searches"
import { SavedSearchRow } from "./saved-search-row"
import { ListRowSkeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "保存した検索",
  robots: { index: false, follow: false },
}

export default async function SavedSearchesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bookmark className="h-6 w-6 text-primary-500" />
            保存した検索
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            条件を保存しておくと、新着求人があったときに自動で通知が届きます。
          </p>
        </div>
        <Link
          href="/jobs"
          className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-bold text-white"
        >
          <Search className="h-4 w-4" />
          新しく検索する
        </Link>
      </div>

      <Suspense fallback={<div className="mt-6"><ListRowSkeleton count={4} /></div>}>
        <SavedSearchList userId={session.user.id} />
      </Suspense>
    </div>
  )
}

async function SavedSearchList({ userId }: { userId: string }) {
  const items = await prisma.savedSearch
    .findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    })
    .catch(() => [])

  if (items.length === 0) {
    return (
      <div className="mt-8 border bg-white p-10 text-center text-sm text-gray-600 space-y-3">
        <p>まだ保存した検索はありません。</p>
        <p className="text-xs text-gray-500">
          求人検索画面で条件を絞ったあと、「この条件を保存」ボタンから追加できます。
        </p>
        <Link
          href="/jobs"
          className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white"
        >
          <Search className="h-4 w-4" />
          求人を探す
        </Link>
      </div>
    )
  }

  return (
    <ul className="mt-6 divide-y border bg-white">
      {items.map((s) => (
        <SavedSearchRow
          key={s.id}
          id={s.id}
          name={s.name}
          alertEnabled={s.alertEnabled}
          label={formatSearchLabel(s)}
          href={`/jobs?${toSearchQueryString(s)}`}
          createdAt={s.createdAt.toISOString()}
          tags={s.tags ?? []}
          excludeKeywords={s.excludeKeywords ?? []}
        />
      ))}
    </ul>
  )
}

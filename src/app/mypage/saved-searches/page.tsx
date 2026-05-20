import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Search as SearchIcon } from "lucide-react"
import type { Metadata } from "next"
import { SavedSearchList } from "./list"

export const metadata: Metadata = {
  title: "保存した検索条件",
}

export default async function SavedSearchesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const searches = await prisma.savedSearch.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">
          保存した検索条件
        </h1>
        <Link
          href="/mypage"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← マイページ
        </Link>
      </div>

      <p className="mt-2 text-sm text-gray-600">
        条件を保存すると、新しい求人が登録された際にメールでお知らせします。
      </p>

      {searches.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-white p-8 text-center shadow-sm">
          <SearchIcon className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">保存した条件はまだありません。</p>
          <Link
            href="/jobs"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            求人を探す →
          </Link>
        </div>
      ) : (
        <SavedSearchList
          initial={searches.map((s) => ({
            id: s.id,
            name: s.name,
            prefecture: s.prefecture,
            category: s.category,
            employmentType: s.employmentType,
            salaryMin: s.salaryMin,
            keyword: s.keyword,
            alertEnabled: s.alertEnabled,
          }))}
        />
      )}
    </div>
  )
}

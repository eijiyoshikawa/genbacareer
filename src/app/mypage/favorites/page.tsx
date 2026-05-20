import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Heart, MapPin, Banknote } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "お気に入り",
}

export default async function FavoritesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const favorites = await prisma.favorite.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          prefecture: true,
          city: true,
          salaryMin: true,
          salaryMax: true,
          salaryType: true,
          status: true,
          company: { select: { name: true } },
        },
      },
    },
  })

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">お気に入り</h1>
        <Link
          href="/mypage"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← マイページ
        </Link>
      </div>

      {favorites.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-white p-8 text-center shadow-sm">
          <Heart className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">
            お気に入りに保存した求人はまだありません。
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            求人を探す →
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {favorites.map((fav) => (
            <li
              key={fav.id}
              className="rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <Link
                    href={`/jobs/${fav.job.id}`}
                    className="text-base font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {fav.job.title}
                  </Link>
                  {fav.job.company && (
                    <p className="text-sm text-gray-600">
                      {fav.job.company.name}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {fav.job.prefecture}
                      {fav.job.city ? ` ${fav.job.city}` : ""}
                    </span>
                    {(fav.job.salaryMin || fav.job.salaryMax) && (
                      <span className="inline-flex items-center gap-1">
                        <Banknote className="h-3.5 w-3.5" />
                        {fav.job.salaryMin?.toLocaleString() ?? "?"} 〜{" "}
                        {fav.job.salaryMax?.toLocaleString() ?? "?"}
                      </span>
                    )}
                    {fav.job.status !== "active" && (
                      <span className="inline-flex items-center rounded bg-gray-200 px-1.5 text-gray-600">
                        募集終了
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

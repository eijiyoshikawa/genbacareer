import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Suspense } from "react"
import { Star, Buildings, MagnifyingGlass } from "@phosphor-icons/react/dist/ssr"
import type { Metadata } from "next"
import { CompanyFollowButton } from "@/components/companies/follow-button"
import { ListRowSkeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "フォロー企業",
  robots: { index: false, follow: false },
}

export default async function FollowedCompaniesPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Star className="h-6 w-6 text-amber-500" weight="fill" />
            フォロー企業
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            フォローした企業に新しい求人が公開されると、自動で通知が届きます。
          </p>
        </div>
        <Link
          href="/jobs"
          className="press inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-3 py-2 text-sm font-bold text-white"
        >
          <MagnifyingGlass className="h-4 w-4" />
          企業を探す
        </Link>
      </div>

      <Suspense fallback={<div className="mt-6"><ListRowSkeleton count={4} /></div>}>
        <FollowedCompaniesList userId={session.user.id} />
      </Suspense>
    </div>
  )
}

async function FollowedCompaniesList({ userId }: { userId: string }) {
  const follows = await prisma.companyFollow
    .findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        companyId: true,
        createdAt: true,
        company: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            industry: true,
            prefecture: true,
            city: true,
            status: true,
            source: true,
            _count: { select: { jobs: { where: { status: "active" } } } },
          },
        },
      },
    })
    .catch(() => [])

  if (follows.length === 0) {
    return (
      <div className="mt-8 border bg-white p-10 text-center text-sm text-gray-600 space-y-3">
        <p>まだフォローしている企業はありません。</p>
        <p className="text-xs text-gray-500">
          企業ページの「フォローして新着通知」ボタンから登録できます。
        </p>
      </div>
    )
  }

  return (
    <ul className="mt-6 grid gap-3">
      {follows.map((f) => {
        const c = f.company
        const visible = c.status === "approved" && c.source === "direct"
        return (
          <li
            key={c.id}
            className="flex items-start gap-3 border bg-white p-4"
          >
            {c.logoUrl ? (
              <div className="relative h-12 w-12 shrink-0 overflow-hidden border bg-white">
                <Image
                  src={c.logoUrl}
                  alt={`${c.name} のロゴ`}
                  fill
                  sizes="48px"
                  className="object-contain"
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border bg-primary-50">
                <Buildings className="h-6 w-6 text-primary-400" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              {visible ? (
                <Link
                  href={`/companies/${c.id}`}
                  className="text-sm font-bold text-gray-900 hover:text-primary-700"
                >
                  {c.name}
                </Link>
              ) : (
                <p className="text-sm font-bold text-gray-500">
                  {c.name}
                  <span className="ml-2 text-xs font-normal text-gray-400">
                    (非公開中)
                  </span>
                </p>
              )}
              <p className="mt-0.5 text-xs text-gray-500">
                {[c.industry, c.prefecture, c.city].filter(Boolean).join(" / ")}
              </p>
              <p className="mt-0.5 text-xs text-gray-400">
                募集中 {c._count.jobs} 件・フォロー開始{" "}
                {f.createdAt.toLocaleDateString("ja-JP")}
              </p>
            </div>
            <CompanyFollowButton
              companyId={c.id}
              initialFollowing
              loggedIn
            />
          </li>
        )
      })}
    </ul>
  )
}

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  FileText,
  User,
  Pencil,
  Bell,
  Bookmark,
  BookmarkCheck,
  Star,
  Sparkles,
  Shield,
  Mail,
} from "lucide-react"
import { Suspense } from "react"
import type { Metadata } from "next"
import { getRecommendedJobs } from "@/lib/job-recommendations"
import { JobCard } from "@/components/jobs/job-card"
import { JobCardSkeletonGrid, Skeleton } from "@/components/ui/skeleton"
import { calcProfileCompletion } from "@/lib/profile-completion"
import { ProfileCompletionCard } from "@/components/mypage/profile-completion-card"

export const metadata: Metadata = {
  title: "マイページ",
}

export default async function MyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  // ヘッダーと profile completion 表示に必要な user だけ block で取得し、
  // 各 Link カードの count は <Suspense> で streaming する（TTFB 改善）。
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      prefecture: true,
      city: true,
      birthDate: true,
      desiredCategories: true,
      desiredSalaryMin: true,
      resumeUrl: true,
      emailVerified: true,
      createdAt: true,
    },
  })

  if (!user) redirect("/login")

  const completion = calcProfileCompletion(user)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>

      <div className="mt-6">
        <ProfileCompletionCard
          percent={completion.percent}
          items={completion.items}
        />
      </div>

      {/* User Info */}
      <div className="mt-6  border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center bg-primary-100">
            <User className="h-7 w-7 text-primary-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-gray-900">
              {user.name ?? "名前未設定"}
            </p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-gray-500">お住まいの地域</dt>
            <dd className="text-sm text-gray-900">
              {user.prefecture ?? "未設定"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-gray-500">登録日</dt>
            <dd className="text-sm text-gray-900">
              {user.createdAt.toLocaleDateString("ja-JP")}
            </dd>
          </div>
        </dl>
      </div>

      {/* Quick Links */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Suspense fallback={<QuickLinkCountsSkeleton />}>
          <QuickLinkCounts userId={session.user.id} />
        </Suspense>

        <Link
          href="/mypage/profile"
          className="flex items-center gap-4  border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center  bg-green-100">
            <Pencil className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">プロフィール編集</p>
            <p className="text-sm text-gray-500">情報を更新する</p>
          </div>
        </Link>

        <Link
          href="/mypage/resume"
          className="flex items-center gap-4  border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center  bg-amber-100">
            <FileText className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">履歴書・職務経歴書</p>
            <p className="text-sm text-gray-500">作成・アップロード</p>
          </div>
        </Link>

        <Link
          href="/mypage/blocks"
          className="flex items-center gap-4  border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center  bg-red-100">
            <Shield className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">ブロック企業 / NG KW</p>
            <p className="text-sm text-gray-500">現職バレ防止に</p>
          </div>
        </Link>

        <Link
          href="/jobs"
          className="flex items-center gap-4  border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center  bg-primary-100">
            <svg
              className="h-5 w-5 text-primary-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">求人検索</p>
            <p className="text-sm text-gray-500">新しい求人を探す</p>
          </div>
        </Link>
      </div>

      {/* あなたへのおすすめ求人 (パーソナライズ) */}
      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Sparkles className="h-5 w-5 text-amber-500" />
          あなたへのおすすめ求人
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          お気に入り・応募・閲覧履歴から、興味に合いそうな求人を選んでいます。
        </p>
        <div className="mt-4">
          <Suspense fallback={<JobCardSkeletonGrid count={4} cols="sm:grid-cols-2" />}>
            <RecommendedJobsSection userId={session.user.id} />
          </Suspense>
        </div>
      </section>
    </div>
  )
}

async function RecommendedJobsSection({ userId }: { userId: string }) {
  const jobs = await getRecommendedJobs(userId, 6)
  if (jobs.length === 0) {
    return (
      <div className="border bg-warm-50 p-6 text-center text-sm text-gray-600">
        まだ募集中の建設業求人がありません。
      </div>
    )
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {jobs.map((job) => (
        <JobCard key={job.id} job={job} loggedIn />
      ))}
    </div>
  )
}

async function QuickLinkCounts({ userId }: { userId: string }) {
  const [
    applicationCount,
    unreadNotifications,
    savedSearchCount,
    favoriteCount,
    companyFollowCount,
    activeScoutCount,
  ] = await Promise.all([
    prisma.application.count({ where: { userId } }).catch(() => 0),
    prisma.notification
      .count({ where: { userId, readAt: null } })
      .catch(() => 0),
    prisma.savedSearch.count({ where: { userId } }).catch(() => 0),
    prisma.jobFavorite.count({ where: { userId } }).catch(() => 0),
    prisma.companyFollow.count({ where: { userId } }).catch(() => 0),
    prisma.scoutMessage
      .count({ where: { userId, status: { in: ["sent", "read"] } } })
      .catch(() => 0),
  ])

  return (
    <>
      <Link
        href="/mypage/notifications"
        className="flex items-center gap-4 border bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="relative flex h-10 w-10 items-center justify-center bg-amber-100">
          <Bell className="h-5 w-5 text-amber-700" />
          {unreadNotifications > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 text-xs font-bold text-white bg-red-500">
              {unreadNotifications > 99 ? "99+" : unreadNotifications}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">通知</p>
          <p className="text-sm text-gray-500">
            {unreadNotifications > 0
              ? `未読 ${unreadNotifications} 件`
              : "未読はありません"}
          </p>
        </div>
      </Link>

      <Link
        href="/mypage/applications"
        className="flex items-center gap-4  border bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center  bg-primary-100">
          <FileText className="h-5 w-5 text-primary-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">応募一覧</p>
          <p className="text-sm text-gray-500">{applicationCount} 件の応募</p>
        </div>
      </Link>

      <Link
        href="/mypage/scouts"
        className="flex items-center gap-4 border bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="relative flex h-10 w-10 items-center justify-center bg-orange-100">
          <Mail className="h-5 w-5 text-orange-700" />
          {activeScoutCount > 0 && (
            <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-[20px] items-center justify-center bg-red-500 px-1 text-[10px] font-bold text-white">
              {activeScoutCount}
            </span>
          )}
        </div>
        <div>
          <p className="font-semibold text-gray-900">スカウト</p>
          <p className="text-sm text-gray-500">
            {activeScoutCount > 0
              ? `${activeScoutCount} 件のスカウトを受信中`
              : "企業からの直接スカウトを受信"}
          </p>
        </div>
      </Link>

      <Link
        href="/mypage/favorites"
        className="flex items-center gap-4 border bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center bg-amber-100">
          <BookmarkCheck className="h-5 w-5 text-amber-700" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">お気に入り</p>
          <p className="text-sm text-gray-500">
            {favoriteCount > 0 ? `${favoriteCount} 件保存中` : "気になる求人を保存"}
          </p>
        </div>
      </Link>

      <Link
        href="/mypage/saved-searches"
        className="flex items-center gap-4 border bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center bg-sky-100">
          <Bookmark className="h-5 w-5 text-sky-700" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">保存した検索</p>
          <p className="text-sm text-gray-500">
            {savedSearchCount > 0
              ? `${savedSearchCount} 件 — 新着があれば通知`
              : "条件を保存して新着通知を受け取る"}
          </p>
        </div>
      </Link>

      <Link
        href="/mypage/companies/follow"
        className="flex items-center gap-4 border bg-white p-5 shadow-sm transition hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center bg-amber-100">
          <Star className="h-5 w-5 text-amber-600" />
        </div>
        <div>
          <p className="font-semibold text-gray-900">フォロー企業</p>
          <p className="text-sm text-gray-500">
            {companyFollowCount > 0
              ? `${companyFollowCount} 社 — 新着求人があれば通知`
              : "気になる企業をフォロー"}
          </p>
        </div>
      </Link>
    </>
  )
}

function QuickLinkCountsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 border bg-white p-5 shadow-sm"
        >
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </>
  )
}

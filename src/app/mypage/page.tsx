import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { FileText, User, Pencil, Mail } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "マイページ",
}

export default async function MyPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [user, applicationCount, scoutCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        prefecture: true,
        createdAt: true,
      },
    }),
    prisma.application.count({
      where: { userId: session.user.id },
    }),
    prisma.scout.count({
      where: { userId: session.user.id },
    }),
  ])

  if (!user) redirect("/login")

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">マイページ</h1>

      {/* User Info */}
      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <User className="h-7 w-7 text-blue-600" />
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
        <Link
          href="/mypage/applications"
          className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">応募一覧</p>
            <p className="text-sm text-gray-500">
              {applicationCount} 件の応募
            </p>
          </div>
        </Link>

        <Link
          href="/mypage/scouts"
          className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100">
            <Mail className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">スカウト</p>
            <p className="text-sm text-gray-500">
              {scoutCount} 件のスカウト
            </p>
          </div>
        </Link>

        <Link
          href="/mypage/profile"
          className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
            <Pencil className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">プロフィール編集</p>
            <p className="text-sm text-gray-500">情報を更新する</p>
          </div>
        </Link>

        <Link
          href="/mypage/favorites"
          className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100">
            <svg
              className="h-5 w-5 text-rose-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
              />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">お気に入り</p>
            <p className="text-sm text-gray-500">保存した求人を見る</p>
          </div>
        </Link>

        <Link
          href="/mypage/saved-searches"
          className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-100">
            <svg
              className="h-5 w-5 text-orange-600"
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
            <p className="font-semibold text-gray-900">保存した検索条件</p>
            <p className="text-sm text-gray-500">新着求人の通知を受け取る</p>
          </div>
        </Link>

        <Link
          href="/jobs"
          className="flex items-center gap-4 rounded-lg border bg-white p-5 shadow-sm transition hover:shadow-md"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
            <svg
              className="h-5 w-5 text-blue-600"
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

      <div className="mt-10 border-t pt-6">
        <Link
          href="/mypage/account"
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          アカウント設定・退会
        </Link>
      </div>
    </div>
  )
}

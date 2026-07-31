import { auth } from "@/lib/auth"
import { parsePage } from "@/lib/pagination"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import type { Metadata } from "next"
import { Bell, CircleCheck } from "lucide-react"
import { NotificationList } from "./notification-list"
import { ListRowSkeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "通知",
  robots: { index: false, follow: false },
}

const PER_PAGE = 30

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; filter?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const page = parsePage(params.page)
  const filter = params.filter === "unread" ? "unread" : "all"

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <Bell className="h-6 w-6 text-primary-500" />
            通知
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            応募ステータスや新着求人などの最新情報をここで確認できます。
          </p>
          <Link
            href="/mypage/notifications/settings"
            className="mt-2 inline-block text-xs text-primary-600 underline hover:text-primary-700"
          >
            通知設定 (チャネル / 頻度 / 静音時間) →
          </Link>
        </div>
      </div>

      {/* Filter tabs (unread count はストリーミングで遅延表示) */}
      <div className="mt-6 flex gap-2 border-b">
        <Link
          href="/mypage/notifications"
          className={`px-3 py-2 text-sm font-bold border-b-2 ${
            filter === "all"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          すべて
        </Link>
        <Link
          href="/mypage/notifications?filter=unread"
          className={`px-3 py-2 text-sm font-bold border-b-2 ${
            filter === "unread"
              ? "border-primary-600 text-primary-700"
              : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          未読のみ
        </Link>
      </div>

      <Suspense
        key={`${filter}:${page}`}
        fallback={<div className="mt-6"><ListRowSkeleton count={6} /></div>}
      >
        <NotificationsBody
          userId={session.user.id}
          page={page}
          filter={filter}
        />
      </Suspense>
    </div>
  )
}

async function NotificationsBody({
  userId,
  page,
  filter,
}: {
  userId: string
  page: number
  filter: "all" | "unread"
}) {
  const where = {
    userId,
    ...(filter === "unread" ? { readAt: null } : {}),
  }

  const [items, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        type: true,
        title: true,
        body: true,
        linkUrl: true,
        createdAt: true,
        readAt: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId, readAt: null },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <>
      {unreadCount > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-sm text-gray-600">
            未読
            <span className="inline-flex items-center justify-center min-w-[1.5rem] bg-primary-600 px-2 text-sm font-bold text-white">
              {unreadCount}
            </span>
            件
          </span>
          <form
            action="/api/users/me/notifications/mark-all-read"
            method="POST"
          >
            <button
              type="submit"
              className="press inline-flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700"
            >
              <CircleCheck className="h-4 w-4" />
              すべて既読にする
            </button>
          </form>
        </div>
      )}

      {items.length === 0 ? (
        <div className="mt-8 border bg-white p-10 text-center text-sm text-gray-500">
          {filter === "unread"
            ? "未読の通知はありません。"
            : "通知はまだありません。"}
        </div>
      ) : (
        <NotificationList
          items={items.map((n) => ({
            id: n.id,
            type: n.type,
            title: n.title,
            body: n.body,
            linkUrl: n.linkUrl,
            createdAt: n.createdAt.toISOString(),
            readAt: n.readAt ? n.readAt.toISOString() : null,
          }))}
        />
      )}

      {totalPages > 1 && (
        <nav className="mt-6 flex items-center justify-center gap-2 text-sm">
          {page > 1 && (
            <Link
              href={`/mypage/notifications?page=${page - 1}${
                filter === "unread" ? "&filter=unread" : ""
              }`}
              className="border bg-white px-3 py-1.5 hover:bg-gray-50"
            >
              ← 前へ
            </Link>
          )}
          <span className="text-gray-500">
            {page} / {totalPages}
          </span>
          {page < totalPages && (
            <Link
              href={`/mypage/notifications?page=${page + 1}${
                filter === "unread" ? "&filter=unread" : ""
              }`}
              className="border bg-white px-3 py-1.5 hover:bg-gray-50"
            >
              次へ →
            </Link>
          )}
        </nav>
      )}
    </>
  )
}

/**
 * 3.4 通知頻度・時間帯設定。
 *
 * 求職者が「メール / LINE / プッシュ」のチャネル ON/OFF、配信頻度、
 * 静音時間帯を設定する画面。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Bell } from "lucide-react"
import type { Metadata } from "next"
import { parsePrefs } from "@/lib/notification-prefs"
import { NotificationPrefsForm } from "./prefs-form"

export const metadata: Metadata = {
  title: "通知設定",
}

export default async function NotificationSettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { notificationPrefs: true },
  })
  if (!user) redirect("/login")

  const prefs = parsePrefs(user.notificationPrefs)

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        マイページへ戻る
      </Link>

      <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-gray-900 dark:text-gray-100">
        <Bell className="h-6 w-6 text-primary-500" />
        通知設定
      </h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        受信したい通知チャネル・頻度・静音時間帯を設定できます。
      </p>

      <div className="mt-8">
        <NotificationPrefsForm initial={prefs} />
      </div>
    </div>
  )
}

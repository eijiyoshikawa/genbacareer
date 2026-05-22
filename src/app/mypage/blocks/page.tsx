/**
 * 17.3 ブロック企業 / NG キーワード設定。
 *
 * 現職バレ防止のため、求人検索結果から特定の企業や NG キーワードを含む
 * 求人を除外できる。User.blockedCompanyIds / blockedKeywords に保存。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { Shield, ArrowLeft } from "lucide-react"
import Link from "next/link"
import type { Metadata } from "next"
import { BlockSettingsForm } from "./block-settings-form"

export const metadata: Metadata = {
  title: "ブロック企業 / NG キーワード",
}

export default async function BlocksPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      blockedCompanyIds: true,
      blockedKeywords: true,
    },
  })

  if (!user) redirect("/login")

  // ブロック中企業の名前を取得 (UI 表示用)
  const blockedCompanies = user.blockedCompanyIds.length
    ? await prisma.company
        .findMany({
          where: { id: { in: user.blockedCompanyIds } },
          select: { id: true, name: true, logoUrl: true, prefecture: true },
        })
        .catch(() => [])
    : []

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/mypage"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        マイページへ戻る
      </Link>

      <h1 className="mt-4 flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Shield className="h-6 w-6 text-primary-500" />
        ブロック企業 / NG キーワード
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        現職や知り合いの会社からの閲覧を防ぐため、特定の企業や
        NG キーワードを含む求人を検索結果から除外できます。
      </p>

      <div className="mt-8">
        <BlockSettingsForm
          initialBlockedCompanies={blockedCompanies}
          initialBlockedKeywords={user.blockedKeywords}
        />
      </div>
    </div>
  )
}

/**
 * 12.x スカウトメッセージ詳細。
 *
 * 求職者本人のスカウトを表示。閲覧時に未読 → 既読へ自動マーク。
 * 応募ボタン / 辞退ボタンを提供。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, MapPin, Briefcase, Clock } from "lucide-react"
import type { Metadata } from "next"
import { DeclineScoutButton } from "./decline-button"
import { isValidUuid } from "@/lib/uuid"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "スカウト詳細",
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function ScoutDetailPage({ params }: Props) {
  const { id } = await params
  if (!isValidUuid(id)) notFound()
  const session = await auth()
  if (!session?.user) redirect("/login")
  const userId = (session.user as { id?: string }).id
  if (!userId) redirect("/login")

  const scout = await prisma.scoutMessage.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      subject: true,
      body: true,
      status: true,
      sentAt: true,
      expiresAt: true,
      declineReason: true,
      job: {
        select: {
          id: true,
          title: true,
          prefecture: true,
          city: true,
          category: true,
          status: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
          logoUrl: true,
        },
      },
    },
  })

  if (!scout || scout.userId !== userId) notFound()

  // 未読 → 既読を自動更新 (期限切れ / 辞退済みは変更しない)
  if (scout.status === "sent") {
    await prisma.scoutMessage.update({
      where: { id: scout.id },
      data: { status: "read", readAt: new Date() },
    })
    scout.status = "read"
  }

  const isActive = scout.status === "sent" || scout.status === "read"
  const isExpired = scout.status === "expired"
  const isDeclined = scout.status === "declined"
  const canApply = isActive && scout.job?.status === "active"

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/mypage/scouts"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> 受信トレイに戻る
      </Link>

      <div className="mt-4 border border-warm-200 bg-white p-6">
        {/* ステータスバナー */}
        {isExpired && (
          <div className="mb-4 border border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
            このスカウトは有効期限を過ぎたため終了しています。
          </div>
        )}
        {isDeclined && (
          <div className="mb-4 border border-gray-300 bg-gray-50 p-3 text-sm text-gray-600">
            このスカウトは辞退済みです。
            {scout.declineReason && (
              <p className="mt-1 text-xs">理由: {scout.declineReason}</p>
            )}
          </div>
        )}

        {/* 企業情報 */}
        <div className="flex items-start gap-3">
          {scout.company?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={scout.company.logoUrl}
              alt={scout.company.name}
              className="h-12 w-12 rounded object-contain"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center bg-warm-100">
              <Building2 className="h-6 w-6 text-gray-400" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-black text-ink-900 tracking-tight">
              {scout.company?.name ?? "企業"}
            </h1>
            <p className="text-xs text-gray-500">
              {formatDate(scout.sentAt)} 受信 ・ 有効期限 {formatDate(scout.expiresAt)}
            </p>
          </div>
        </div>

        {/* 求人情報 */}
        <div className="mt-4 border-t border-warm-200 pt-4">
          <p className="flex items-center gap-1 text-xs font-bold text-gray-500">
            <Briefcase className="h-3.5 w-3.5" /> [職種]
          </p>
          <p className="mt-1 font-bold text-ink-900">{scout.job?.title ?? "求人情報"}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {scout.job?.prefecture}
            {scout.job?.city && ` ・ ${scout.job.city}`}
          </p>
        </div>

        {/* メッセージ本文 */}
        <div className="mt-6 border-t border-warm-200 pt-6">
          <p className="text-xs font-bold text-gray-500">メッセージ</p>
          <h2 className="mt-1 font-bold text-ink-900">{scout.subject}</h2>
          <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink-900">
            {scout.body}
          </p>
        </div>

        {/* CTA */}
        {canApply && (
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href={`/jobs/${scout.job?.id}/apply?from=scout&scoutId=${scout.id}`}
              className="bg-primary-600 px-6 py-3 text-center text-sm font-bold text-white hover:bg-primary-700"
            >
              この求人に応募する
            </Link>
            <Link
              href={`/jobs/${scout.job?.id}`}
              className="border border-warm-300 bg-white px-6 py-3 text-center text-sm font-medium text-ink-900 hover:bg-warm-50"
            >
              求人詳細を見る
            </Link>
            <DeclineScoutButton scoutId={scout.id} />
          </div>
        )}

        {/* 有効期限の案内 */}
        {isActive && (
          <p className="mt-6 flex items-center gap-1 text-xs text-gray-500">
            <Clock className="h-3.5 w-3.5" />
            企業からの返信期限は {formatDate(scout.expiresAt)} です。お早めにご対応ください。
          </p>
        )}
      </div>
    </div>
  )
}

function formatDate(d: Date): string {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, "0")
  const day = d.getDate().toString().padStart(2, "0")
  return `${y}/${m}/${day}`
}

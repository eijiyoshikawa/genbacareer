/**
 * 12.x 企業 → 求職者 スカウト送信フォーム。
 *
 * クエリ: ?userId=&jobId=
 *   - 通常は /company/interests から「スカウト送信」リンクで遷移
 *   - 必須プリセット: jobId + userId
 *
 * 件名はサーバ側で固定生成されるためフォーム上では表示のみ。
 * 本文は 20〜2,000 文字。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { ScoutForm } from "./scout-form"
import { buildScoutSubject, canSendScout } from "@/lib/scouts"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "スカウト送信",
}

type Props = {
  searchParams: Promise<{ userId?: string; jobId?: string }>
}

export default async function ScoutNewPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")
  if (role !== "company_admin" && role !== "company_member") redirect("/login")

  const params = await searchParams
  const userId = params.userId
  const jobId = params.jobId

  if (!userId || !jobId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-red-600">
          求人 ID と求職者 ID の両方を指定してください。
        </p>
        <Link href="/company/interests" className="text-sm text-primary-600">
          ← 気になる候補一覧へ
        </Link>
      </div>
    )
  }

  const [job, user, existing] = await Promise.all([
    prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        title: true,
        status: true,
        companyId: true,
        company: { select: { name: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        status: true,
        jobSearchStatus: true,
        prefecture: true,
        profilePublic: true,
        blockedCompanyIds: true,
      },
    }),
    prisma.scoutMessage.findFirst({
      where: {
        jobId,
        userId,
        companyId,
        status: { in: ["sent", "read"] },
      },
      select: { id: true, sentAt: true },
    }),
  ])

  if (!job || job.companyId !== companyId) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-red-600">求人が見つかりません。</p>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
        <p className="text-sm text-red-600">求職者が見つかりません。</p>
      </div>
    )
  }

  const canSend = canSendScout({ job, user, companyId })
  const subject = buildScoutSubject(job.company?.name ?? "企業")

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 lg:px-8">
      <Link
        href="/company/scouts"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-ink-900"
      >
        <ArrowLeft className="h-4 w-4" /> スカウト履歴へ
      </Link>

      <h1 className="mt-4 text-2xl font-black text-ink-900 tracking-tight">
        スカウト送信
      </h1>

      <div className="mt-4 border border-warm-200 bg-white p-5">
        <p className="text-xs font-bold text-gray-500">[求人]</p>
        <p className="mt-1 font-bold text-ink-900">{job.title}</p>

        <p className="mt-4 text-xs font-bold text-gray-500">[求職者]</p>
        <p className="mt-1 font-bold text-ink-900">{user.name ?? "求職者"}</p>
        <p className="text-xs text-gray-500">
          {user.prefecture} · 求職状況: {labelJobSearchStatus(user.jobSearchStatus)}
        </p>

        <p className="mt-4 text-xs font-bold text-gray-500">[件名 (自動生成)]</p>
        <p className="mt-1 text-sm text-ink-900 bg-warm-50 p-2">{subject}</p>
      </div>

      {existing && (
        <div className="mt-4 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          この求職者には既にアクティブなスカウトが送信済みです (
          {existing.sentAt.toLocaleDateString("ja-JP")} 送信)。期限切れ後に再送できます。
        </div>
      )}

      {!canSend && !existing && (
        <div className="mt-4 border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          現在この組合せでは送信できません。
          求人が active で、求職者が「求職中」または「在職中(スカウト歓迎)」であり、
          プロフィールを公開設定にしていて、貴社をブロックしていない場合のみ送信できます。
        </div>
      )}

      <div className="mt-6">
        <ScoutForm
          jobId={job.id}
          userId={user.id}
          disabled={!canSend || !!existing}
        />
      </div>
    </div>
  )
}

function labelJobSearchStatus(s: string): string {
  switch (s) {
    case "searching":
      return "求職中"
    case "employed_open":
      return "在職中 (スカウト歓迎)"
    case "hired":
      return "採用済み (非アクティブ)"
    default:
      return s
  }
}

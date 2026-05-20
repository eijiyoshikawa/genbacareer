import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import { Building2, MapPin } from "lucide-react"
import type { Metadata } from "next"
import { MessageThread } from "@/components/jobs/message-thread"
import { WithdrawButton } from "@/components/jobs/withdraw-button"

export const metadata: Metadata = {
  title: "応募の詳細",
}

type Props = {
  params: Promise<{ id: string }>
}

const STATUS_LABEL: Record<string, string> = {
  applied: "応募済み",
  reviewing: "選考中",
  interview: "面接",
  offered: "内定",
  hired: "採用",
  rejected: "不採用",
  withdrawn: "取り下げ",
}

export default async function ApplicationDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const { id } = await params

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          prefecture: true,
          city: true,
          company: { select: { name: true } },
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!application || application.userId !== session.user.id) notFound()

  const canWithdraw =
    application.status !== "withdrawn" &&
    application.status !== "hired" &&
    application.status !== "rejected"

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/mypage/applications"
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← 応募一覧へ
      </Link>

      <div className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold text-gray-900">
              {application.job.title}
            </h1>
            {application.job.company && (
              <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                <Building2 className="h-4 w-4" />
                {application.job.company.name}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
              <MapPin className="h-4 w-4" />
              {application.job.prefecture}
              {application.job.city ? ` ${application.job.city}` : ""}
            </p>
            <p className="mt-2 text-xs text-gray-400">
              応募日 {application.createdAt.toLocaleDateString("ja-JP")} —{" "}
              ステータス {STATUS_LABEL[application.status] ?? application.status}
            </p>
          </div>
          {canWithdraw && <WithdrawButton applicationId={application.id} />}
        </div>

        {application.message && (
          <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
            <p className="text-xs font-semibold text-gray-500">
              応募時のメッセージ
            </p>
            <p className="mt-1">{application.message}</p>
          </div>
        )}
      </div>

      <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900">
          企業とのメッセージ
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          応募・選考に関する連絡はこちらでやり取りできます。
        </p>
        <div className="mt-4">
          <MessageThread
            applicationId={application.id}
            initial={application.messages.map((m) => ({
              id: m.id,
              senderKind: m.senderKind,
              body: m.body,
              createdAt: m.createdAt.toISOString(),
            }))}
            viewerKind="seeker"
            disabled={application.status === "withdrawn"}
          />
        </div>
      </div>
    </div>
  )
}

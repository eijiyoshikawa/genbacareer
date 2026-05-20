import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, Briefcase, Mail } from "lucide-react"
import type { Metadata } from "next"
import { ScoutResponse } from "@/components/jobs/scout-response"

export const metadata: Metadata = {
  title: "スカウト一覧",
}

export default async function ScoutsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const scouts = await prisma.scout.findMany({
    where: { userId: session.user.id },
    orderBy: { sentAt: "desc" },
    include: {
      company: { select: { name: true, industry: true } },
      job: { select: { id: true, title: true } },
    },
  })

  // Mark unread scouts as read
  const unreadIds = scouts
    .filter((s) => s.status === "sent")
    .map((s) => s.id)
  if (unreadIds.length > 0) {
    await prisma.scout.updateMany({
      where: { id: { in: unreadIds } },
      data: { status: "read", readAt: new Date() },
    })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">スカウト一覧</h1>
        <Link
          href="/mypage"
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← マイページ
        </Link>
      </div>

      {scouts.length === 0 ? (
        <div className="mt-8 rounded-lg border bg-white p-8 text-center shadow-sm">
          <Mail className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">スカウトはまだ届いていません。</p>
          <p className="mt-1 text-sm text-gray-400">
            プロフィールを公開すると企業からスカウトが届く場合があります。
          </p>
          <Link
            href="/mypage/profile"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            プロフィールを編集する →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {scouts.map((scout) => (
            <div
              key={scout.id}
              className={`rounded-lg border bg-white p-5 shadow-sm ${
                scout.status === "sent" ? "border-blue-200 bg-blue-50/30" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                    <Building2 className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {scout.company.name}
                    </p>
                    {scout.company.industry && (
                      <p className="text-xs text-gray-500">
                        {scout.company.industry}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <ScoutStatusBadge status={scout.status} />
                  <p className="mt-1 text-xs text-gray-400">
                    {scout.sentAt.toLocaleDateString("ja-JP")}
                  </p>
                </div>
              </div>

              {scout.message && (
                <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">
                  {scout.message}
                </p>
              )}

              {scout.job && (
                <Link
                  href={`/jobs/${scout.job.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  {scout.job.title}
                </Link>
              )}

              <ScoutResponse scoutId={scout.id} currentStatus={scout.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScoutStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    sent: { label: "未読", className: "bg-blue-100 text-blue-700" },
    read: { label: "既読", className: "bg-gray-100 text-gray-600" },
    replied: { label: "返信済み", className: "bg-green-100 text-green-700" },
    declined: { label: "辞退", className: "bg-red-100 text-red-600" },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

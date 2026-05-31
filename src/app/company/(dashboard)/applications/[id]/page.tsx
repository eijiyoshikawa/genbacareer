import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import type { Metadata } from "next"
import { ApplicationActionPanel } from "@/components/company/application-action-panel"
import { SchedulingUrlsPanel } from "@/components/company/scheduling-urls-panel"
import { parseSchedulingUrls } from "@/lib/scheduling-urls"
import { EarlyResignationButton } from "@/components/company/early-resignation-button"

export const metadata: Metadata = {
  title: "応募者詳細",
}

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
  note?: string
}

const STATUS_LABEL: Record<string, { label: string; classes: string }> = {
  applied: { label: "応募済み", classes: "bg-blue-100 text-blue-800" },
  reviewing: { label: "選考中", classes: "bg-amber-100 text-amber-800" },
  interview: { label: "面接", classes: "bg-violet-100 text-violet-800" },
  offered: { label: "内定", classes: "bg-emerald-100 text-emerald-800" },
  hired: { label: "採用", classes: "bg-green-200 text-green-900" },
  rejected: { label: "不採用", classes: "bg-gray-200 text-gray-700" },
}

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/company/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/company/login")

  const { id } = await params

  const app = await prisma.application.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      message: true,
      internalNotes: true,
      interviewAt: true,
      interviewVenue: true,
      interviewUrl: true,
      interviewSlots: true,
      statusHistory: true,
      createdAt: true,
      updatedAt: true,
      hiredAt: true,
      companyId: true,
      billingEvent: { select: { amount: true } },
      earlyResignation: { select: { id: true, status: true } },
      job: { select: { id: true, title: true } },
      company: { select: { schedulingUrls: true } },
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          prefecture: true,
          city: true,
        },
      },
    },
  })

  if (!app || app.companyId !== companyId) notFound()

  const status = STATUS_LABEL[app.status] ?? {
    label: app.status,
    classes: "bg-gray-100 text-gray-600",
  }

  const history = Array.isArray(app.statusHistory)
    ? (app.statusHistory as unknown as StatusHistoryEntry[])
    : []

  const schedulingUrls = parseSchedulingUrls(app.company?.schedulingUrls)

  return (
    <div className="space-y-6">
      <Link
        href="/company/applications"
        className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        応募者一覧へ
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {app.user.name ?? "（名前未設定）"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            応募求人:{" "}
            <Link
              href={`/jobs/${app.job.id}`}
              className="text-primary-700 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {app.job.title}
            </Link>
          </p>
        </div>
        <span
          className={`inline-flex items-center px-3 py-1 text-sm font-bold ${status.classes}`}
        >
          {status.label}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Applicant info */}
          <section className="border bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">応募者情報</h2>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold text-gray-500">メール</dt>
                <dd className="mt-0.5">
                  <a
                    href={`mailto:${app.user.email}`}
                    className="text-primary-700 hover:underline"
                  >
                    {app.user.email}
                  </a>
                </dd>
              </div>
              {app.user.phone && (
                <div>
                  <dt className="text-xs font-bold text-gray-500">電話</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${app.user.phone}`}
                      className="text-primary-700 hover:underline"
                    >
                      {app.user.phone}
                    </a>
                  </dd>
                </div>
              )}
              {app.user.prefecture && (
                <div>
                  <dt className="text-xs font-bold text-gray-500">居住地</dt>
                  <dd className="mt-0.5 text-gray-900">{app.user.prefecture}</dd>
                </div>
              )}
              <div>
                <dt className="text-xs font-bold text-gray-500">応募日時</dt>
                <dd className="mt-0.5 text-gray-900">
                  {app.createdAt.toLocaleString("ja-JP")}
                </dd>
              </div>
            </dl>

            {app.message && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-bold text-gray-500">応募メッセージ</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
                  {app.message}
                </p>
              </div>
            )}
          </section>

          {/* Status history */}
          <section className="border bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-gray-900">選考履歴</h2>
            {history.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">
                まだステータス変更履歴はありません。
              </p>
            ) : (
              <ol className="mt-4 space-y-3 border-l border-gray-200 pl-4">
                {history
                  .slice()
                  .reverse()
                  .map((h, i) => (
                    <li key={`${h.at}-${i}`} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary-500" />
                      <p className="text-xs text-gray-500">
                        {new Date(h.at).toLocaleString("ja-JP")}
                      </p>
                      <p className="mt-0.5 text-sm">
                        <span className="font-bold text-gray-700">
                          {STATUS_LABEL[h.from]?.label ?? h.from}
                        </span>
                        {" → "}
                        <span className="font-bold text-primary-700">
                          {STATUS_LABEL[h.to]?.label ?? h.to}
                        </span>
                      </p>
                      {h.note && (
                        <p className="mt-1 text-xs text-gray-600 bg-warm-50 p-2 border-l-2 border-primary-200">
                          {h.note}
                        </p>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </section>
        </div>

        {/* Right column: action panel */}
        <aside className="space-y-4">
          <ApplicationActionPanel
            applicationId={app.id}
            currentStatus={app.status}
            internalNotes={app.internalNotes ?? ""}
            interviewAt={app.interviewAt ? app.interviewAt.toISOString() : null}
            interviewVenue={app.interviewVenue ?? ""}
            interviewUrl={app.interviewUrl ?? ""}
          />
          <SchedulingUrlsPanel urls={schedulingUrls} />

          {/* C3 戻入処理: 採用済みかつ請求済みの場合のみ表示 */}
          {app.status === "hired" && app.hiredAt && app.billingEvent && (
            <div className="border bg-white p-4 shadow-sm">
              <p className="text-xs font-bold text-gray-500">早期退職 (戻入処理)</p>
              <p className="mt-1 text-xs text-gray-500">
                入社後 3 ヶ月以内の退職時は成果報酬の一部が返金されます。
              </p>
              <div className="mt-3">
                <EarlyResignationButton
                  applicationId={app.id}
                  hiredAt={app.hiredAt.toISOString()}
                  originalFeeAmount={app.billingEvent.amount}
                  alreadyReported={!!app.earlyResignation}
                />
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

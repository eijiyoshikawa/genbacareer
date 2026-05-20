import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { notFound, redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { MessageThread } from "@/components/jobs/message-thread"
import { ApplicationStatusSelect } from "@/components/company/application-status-select"

export const metadata: Metadata = {
  title: "応募者の詳細",
}

type Props = {
  params: Promise<{ id: string }>
}

export default async function CompanyApplicationDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const { id } = await params

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      job: { select: { id: true, title: true } },
      user: {
        select: {
          name: true,
          email: true,
          phone: true,
          prefecture: true,
          city: true,
          resumeUrl: true,
          desiredCategories: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  })

  if (!application || application.companyId !== companyId) notFound()

  return (
    <div>
      <Link
        href="/company/applications"
        className="text-sm font-medium text-blue-600 hover:text-blue-700"
      >
        ← 応募者一覧へ
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h1 className="text-xl font-semibold text-gray-900">
              {application.user.name ?? "名前未設定"}
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              求人: {application.job.title}
            </p>

            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <Row label="連絡先メール">{application.user.email}</Row>
              <Row label="電話番号">{application.user.phone ?? "—"}</Row>
              <Row label="居住地">
                {application.user.prefecture ?? "—"}
                {application.user.city ? ` ${application.user.city}` : ""}
              </Row>
              <Row label="希望職種">
                {application.user.desiredCategories?.length
                  ? application.user.desiredCategories.join(", ")
                  : "—"}
              </Row>
              <Row label="履歴書">
                {application.user.resumeUrl ? (
                  <a
                    href={application.user.resumeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 underline"
                  >
                    開く
                  </a>
                ) : (
                  "未登録"
                )}
              </Row>
              <Row label="応募日">
                {application.createdAt.toLocaleDateString("ja-JP")}
              </Row>
            </dl>

            {application.message && (
              <div className="mt-4 rounded-md bg-gray-50 p-3 text-sm text-gray-700 whitespace-pre-wrap">
                <p className="text-xs font-semibold text-gray-500">
                  応募時のメッセージ
                </p>
                <p className="mt-1">{application.message}</p>
              </div>
            )}
          </div>

          <div className="rounded-lg border bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-gray-900">
              応募者とのメッセージ
            </h2>
            <div className="mt-4">
              <MessageThread
                applicationId={application.id}
                initial={application.messages.map((m) => ({
                  id: m.id,
                  senderKind: m.senderKind,
                  body: m.body,
                  createdAt: m.createdAt.toISOString(),
                }))}
                viewerKind="company"
                disabled={application.status === "withdrawn"}
              />
            </div>
          </div>
        </div>

        <aside className="rounded-lg border bg-white p-6 shadow-sm h-fit">
          <h3 className="text-sm font-semibold text-gray-900">
            選考ステータス
          </h3>
          <div className="mt-3">
            <ApplicationStatusSelect
              applicationId={application.id}
              currentStatus={application.status}
            />
          </div>
        </aside>
      </div>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="mt-0.5 text-gray-900">{children}</dd>
    </div>
  )
}

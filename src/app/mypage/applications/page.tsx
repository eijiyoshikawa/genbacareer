import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { parsePositiveInt } from "@/lib/pagination"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Suspense } from "react"
import { Building2, MapPin } from "lucide-react"
import { Pagination } from "@/components/pagination"
import { ApplicationProgressBar } from "@/components/applications/progress-bar"
import { WithdrawButton } from "@/components/applications/withdraw-button"
import { HiringBonusRequestButton } from "@/components/mypage/hiring-bonus-request-button"
import { StopPropagationWrapper } from "@/components/mypage/stop-propagation-wrapper"
import { Skeleton } from "@/components/ui/skeleton"
import { isPlanEligibleForBonus } from "@/lib/plans"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "応募一覧",
}

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

const statusConfig: Record<string, { label: string; className: string }> = {
  applied: {
    label: "応募済み",
    className: "bg-primary-100 text-primary-700",
  },
  reviewing: {
    label: "選考中",
    className: "bg-yellow-100 text-yellow-700",
  },
  interview: {
    label: "面接",
    className: "bg-purple-100 text-purple-700",
  },
  offered: {
    label: "内定",
    className: "bg-indigo-100 text-indigo-700",
  },
  hired: {
    label: "採用",
    className: "bg-green-100 text-green-700",
  },
  rejected: {
    label: "不採用",
    className: "bg-red-100 text-red-700",
  },
  withdrawn: {
    label: "取り消し済み",
    className: "bg-gray-200 text-gray-600",
  },
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const params = await searchParams
  const page = parsePositiveInt(params.page, 1)

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">応募一覧</h1>
        <Link
          href="/mypage"
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          マイページに戻る
        </Link>
      </div>

      <Suspense key={page} fallback={<ApplicationsListSkeleton />}>
        <ApplicationsList userId={session.user.id} page={page} />
      </Suspense>
    </div>
  )
}

async function ApplicationsList({
  userId,
  page,
}: {
  userId: string
  page: number
}) {
  const limit = 20
  const where = { userId }

  // ApplicationsList で実際に使うカラムだけ select する。
  // status_history (Json) など本一覧で使わないカラムは含めない。
  const [applications, total, bonusApplicationIds] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        status: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            title: true,
            prefecture: true,
            city: true,
            company: {
              select: { name: true, planType: true },
            },
          },
        },
      },
    }),
    prisma.application.count({ where }),
    // 15.6 hiring-bonuses 申請済みの applicationId を取得 (重複申請防止)
    prisma.hiringBonus
      .findMany({
        where: { userId },
        select: { applicationId: true },
      })
      .then((rows) => new Set(rows.map((r) => r.applicationId)))
      .catch(() => new Set<string>()),
  ])

  const totalPages = Math.ceil(total / limit)

  return (
    <>
      <p className="mt-2 text-sm text-gray-500">{total} 件の応募</p>

      {applications.length === 0 ? (
        <div className="mt-6 border bg-white p-12 text-center">
          <p className="text-gray-500">まだ応募がありません。</p>
          <Link
            href="/jobs"
            className="mt-4 inline-block bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            求人を探す
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {applications.map((app) => {
            const config = statusConfig[app.status] ?? {
              label: app.status,
              className: "bg-gray-100 text-gray-700",
            }

            return (
              <Link
                key={app.id}
                href={`/jobs/${app.job.id}`}
                className="block border bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-gray-900">
                      {app.job.title}
                    </p>
                    {app.job.company && (
                      <p className="mt-1 flex items-center gap-1 text-sm text-gray-600">
                        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
                        {app.job.company.name}
                      </p>
                    )}
                    <p className="mt-1 flex items-center gap-1 text-sm text-gray-500">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      {app.job.prefecture}
                      {app.job.city ? ` ${app.job.city}` : ""}
                    </p>
                  </div>
                  <span
                    className={`inline-flex flex-shrink-0 items-center px-2.5 py-0.5 text-xs font-medium ${config.className}`}
                  >
                    {config.label}
                  </span>
                </div>

                {/* 進捗バー */}
                <div className="mt-4 border-t pt-3">
                  <ApplicationProgressBar status={app.status} />
                </div>

                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-xs text-gray-400">
                    応募日: {app.createdAt.toLocaleDateString("ja-JP")}
                  </p>
                  <div className="flex items-center gap-2">
                    {app.status === "hired" &&
                      isPlanEligibleForBonus(app.job?.company?.planType) && (
                        <StopPropagationWrapper>
                          <HiringBonusRequestButton
                            applicationId={app.id}
                            alreadyRequested={bonusApplicationIds.has(app.id)}
                          />
                        </StopPropagationWrapper>
                      )}
                    <WithdrawButton
                      applicationId={app.id}
                      status={app.status}
                      createdAt={app.createdAt.toISOString()}
                    />
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="mt-8">
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          basePath="/mypage/applications"
        />
      </div>
    </>
  )
}

function ApplicationsListSkeleton() {
  return (
    <>
      <Skeleton className="mt-2 h-4 w-24" />
      <div className="mt-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="border bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              <Skeleton className="h-5 w-16 shrink-0" />
            </div>
            <div className="mt-4 border-t pt-3">
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

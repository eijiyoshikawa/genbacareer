import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { PREFECTURES } from "@/lib/constants"
import { ScoutSendButton } from "@/components/company/scout-send-button"

export const metadata: Metadata = {
  title: "スカウト管理",
}

const CATEGORIES = [
  { value: "driver", label: "ドライバー" },
  { value: "construction", label: "建設" },
  { value: "manufacturing", label: "製造" },
  { value: "office", label: "事務" },
  { value: "sales", label: "営業" },
  { value: "service", label: "サービス" },
  { value: "it", label: "IT" },
  { value: "other", label: "その他" },
]

export default async function CompanyScoutsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string
    page?: string
    prefecture?: string
    category?: string
    status?: string
  }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const params = await searchParams
  const tab = params.tab || "candidates"
  const page = Math.max(1, Number(params.page) || 1)
  const perPage = 20

  // Fetch company jobs for scout form
  const companyJobs = await prisma.job.findMany({
    where: { companyId, status: "active" },
    select: { id: true, title: true },
    orderBy: { createdAt: "desc" },
  })

  if (tab === "sent") {
    // Sent scouts tab
    const statusFilter = params.status || "all"
    const where = {
      companyId,
      ...(statusFilter !== "all" ? { status: statusFilter } : {}),
    }

    const [scouts, total] = await Promise.all([
      prisma.scout.findMany({
        where,
        orderBy: { sentAt: "desc" },
        skip: (page - 1) * perPage,
        take: perPage,
        include: {
          user: { select: { name: true, email: true, prefecture: true } },
          job: { select: { title: true } },
        },
      }),
      prisma.scout.count({ where }),
    ])

    const totalPages = Math.ceil(total / perPage)

    return (
      <div>
        <h1 className="text-2xl font-bold text-gray-900">スカウト管理</h1>
        <TabNav tab={tab} />

        {/* Status filter */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[
            { value: "all", label: "すべて" },
            { value: "sent", label: "送信済み" },
            { value: "read", label: "既読" },
            { value: "replied", label: "返信済み" },
            { value: "declined", label: "辞退" },
          ].map((opt) => (
            <a
              key={opt.value}
              href={`/company/scouts?tab=sent&status=${opt.value}`}
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                statusFilter === opt.value
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {opt.label}
            </a>
          ))}
        </div>

        {scouts.length === 0 ? (
          <div className="mt-6 rounded-lg border bg-white p-8 text-center shadow-sm">
            <p className="text-gray-500">送信済みのスカウトはありません。</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            {scouts.map((scout) => (
              <div
                key={scout.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {scout.user.name ?? scout.user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {scout.user.prefecture ?? ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <ScoutStatusBadge status={scout.status} />
                    <p className="mt-1 text-xs text-gray-400">
                      {scout.sentAt.toLocaleDateString("ja-JP")}
                    </p>
                  </div>
                </div>
                {scout.job && (
                  <p className="mt-2 text-xs text-gray-500">
                    求人: {scout.job.title}
                  </p>
                )}
                {scout.message && (
                  <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                    {scout.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-4 flex justify-center gap-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <a
                key={p}
                href={`/company/scouts?tab=sent&status=${statusFilter}&page=${p}`}
                className={`rounded-md px-3 py-1 text-sm ${
                  p === page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 border hover:bg-gray-50"
                }`}
              >
                {p}
              </a>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Candidates tab (default)
  const prefectureFilter = params.prefecture || ""
  const categoryFilter = params.category || ""

  const where = {
    profilePublic: true,
    ...(prefectureFilter ? { prefecture: prefectureFilter } : {}),
    ...(categoryFilter
      ? { desiredCategories: { has: categoryFilter } }
      : {}),
  }

  const [candidates, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        name: true,
        prefecture: true,
        city: true,
        desiredCategories: true,
        desiredSalaryMin: true,
        createdAt: true,
        _count: { select: { scouts: { where: { companyId } } } },
      },
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">スカウト管理</h1>
      <TabNav tab={tab} />

      {/* Filters */}
      <form className="mt-4 flex flex-wrap gap-3">
        <input type="hidden" name="tab" value="candidates" />
        <select
          name="prefecture"
          defaultValue={prefectureFilter}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">全都道府県</option>
          {PREFECTURES.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <select
          name="category"
          defaultValue={categoryFilter}
          className="rounded-md border px-3 py-1.5 text-sm"
        >
          <option value="">全職種</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
      </form>

      {candidates.length === 0 ? (
        <div className="mt-6 rounded-lg border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">
            条件に合う候補者が見つかりませんでした。
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {candidates.map((candidate) => {
            const alreadyScouted = candidate._count.scouts > 0
            return (
              <div
                key={candidate.id}
                className="rounded-lg border bg-white p-4 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">
                      {candidate.name ?? "名前非公開"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {[candidate.prefecture, candidate.city]
                        .filter(Boolean)
                        .join(" ")}
                    </p>
                    {candidate.desiredCategories.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {candidate.desiredCategories.map((cat) => (
                          <span
                            key={cat}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {CATEGORIES.find((c) => c.value === cat)?.label ??
                              cat}
                          </span>
                        ))}
                      </div>
                    )}
                    {candidate.desiredSalaryMin && (
                      <p className="mt-1 text-xs text-gray-400">
                        希望月収: {candidate.desiredSalaryMin.toLocaleString()}
                        円〜
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 ml-4">
                    {alreadyScouted ? (
                      <span className="text-xs text-gray-400">
                        スカウト済み
                      </span>
                    ) : (
                      <ScoutSendButton
                        userId={candidate.id}
                        userName={candidate.name ?? "候補者"}
                        jobs={companyJobs}
                      />
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/company/scouts?tab=candidates&prefecture=${prefectureFilter}&category=${categoryFilter}&page=${p}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {p}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}

function TabNav({ tab }: { tab: string }) {
  return (
    <div className="mt-4 flex border-b">
      <Link
        href="/company/scouts?tab=candidates"
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
          tab === "candidates"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        候補者検索
      </Link>
      <Link
        href="/company/scouts?tab=sent"
        className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
          tab === "sent"
            ? "border-blue-600 text-blue-600"
            : "border-transparent text-gray-500 hover:text-gray-700"
        }`}
      >
        送信済みスカウト
      </Link>
    </div>
  )
}

function ScoutStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    sent: { label: "送信済み", className: "bg-blue-100 text-blue-700" },
    read: { label: "既読", className: "bg-gray-100 text-gray-600" },
    replied: { label: "返信あり", className: "bg-green-100 text-green-700" },
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

import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import Link from "next/link"
import { MessageCircle, Phone, Mail, Building2, MapPin } from "lucide-react"
import { LEAD_STATUSES, LEAD_STATUS_META, isLeadStatus, type LeadStatus } from "@/lib/line-lead-status"
import { Pagination } from "@/components/pagination"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "LINE 応募",
  robots: { index: false, follow: false },
}

const PER_PAGE = 30

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

export default async function CompanyLineLeadsPage({ searchParams }: Props) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") redirect("/login")
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? "1"))
  const statusFilter = isLeadStatus(params.status) ? params.status : undefined

  const where = {
    job: { is: { companyId } },
    ...(statusFilter && { status: statusFilter }),
  }

  const [leads, total, statusCounts] = await Promise.all([
    prisma.lineLead
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
        select: {
          id: true,
          createdAt: true,
          name: true,
          phone: true,
          email: true,
          experienceYears: true,
          notes: true,
          status: true,
          lineDisplayName: true,
          optedOut: true,
          job: { select: { id: true, title: true, prefecture: true, city: true } },
        },
      })
      .catch(() => []),
    prisma.lineLead.count({ where }).catch(() => 0),
    prisma.lineLead
      .groupBy({
        by: ["status"],
        where: { job: { is: { companyId } } },
        _count: true,
      })
      .catch(() => [] as Array<{ status: string; _count: number }>),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  // ステータス別件数
  const statusCountMap: Record<LeadStatus, number> = {
    pending: 0,
    line_added: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    rejected: 0,
  }
  for (const sc of statusCounts) {
    if (isLeadStatus(sc.status)) statusCountMap[sc.status] = sc._count
  }
  const allCount = Object.values(statusCountMap).reduce((a, b) => a + b, 0)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <MessageCircle className="h-6 w-6 text-primary-500" />
          LINE 応募一覧
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          自社の求人に LINE 経由で応募された方の一覧です。担当者から連絡があるまでしばらくお待ちください。
        </p>
      </div>

      {/* ステータスフィルタ */}
      <div className="flex flex-wrap gap-1.5">
        <Link
          href="/company/line-leads"
          className={`press px-2.5 py-1 text-xs font-bold border ${
            !statusFilter ? "bg-ink-900 text-white border-ink-900" : "bg-white text-gray-700 border-gray-300"
          }`}
        >
          すべて ({allCount})
        </Link>
        {LEAD_STATUSES.map((s) => (
          <Link
            key={s}
            href={`/company/line-leads?status=${s}`}
            className={`press px-2.5 py-1 text-xs font-bold border ${
              statusFilter === s
                ? "bg-ink-900 text-white border-ink-900"
                : LEAD_STATUS_META[s].classes
            }`}
          >
            {LEAD_STATUS_META[s].label} ({statusCountMap[s]})
          </Link>
        ))}
      </div>

      {/* 件数 */}
      <p className="text-sm text-gray-600">{total.toLocaleString()} 件</p>

      {/* 一覧 */}
      {leads.length === 0 ? (
        <div className="border bg-white p-8 text-center text-sm text-gray-500">
          条件に合う LINE 応募はまだありません。
        </div>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => {
            const status = isLeadStatus(lead.status) ? lead.status : ("pending" as LeadStatus)
            const meta = LEAD_STATUS_META[status]
            return (
              <li key={lead.id} className="border border-gray-200 bg-white p-4">
                <div className="flex items-start gap-3 flex-wrap">
                  <span className={`inline-block px-2 py-0.5 text-xs font-bold border ${meta.classes}`}>
                    {meta.label}
                  </span>
                  {lead.optedOut && (
                    <span className="inline-block px-2 py-0.5 text-xs font-bold border bg-gray-200 text-gray-700 border-gray-300">
                      配信停止
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900">
                      {lead.name}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {new Date(lead.createdAt).toLocaleString("ja-JP", {
                          month: "numeric",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      {lead.lineDisplayName && (
                        <span className="ml-2 text-xs text-emerald-700 font-bold">
                          LINE 連携済 ({lead.lineDisplayName})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <a href={`tel:${lead.phone}`} className="text-primary-700 hover:underline">
                      {lead.phone}
                    </a>
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Mail className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-primary-700 hover:underline truncate"
                    >
                      {lead.email}
                    </a>
                  </div>
                </div>

                {lead.job && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs">
                    <Building2 className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                    <Link
                      href={`/company/jobs/${lead.job.id}/edit`}
                      className="text-gray-700 font-bold hover:text-primary-600 truncate"
                    >
                      {lead.job.title}
                    </Link>
                    <span className="text-gray-400 inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" />
                      {lead.job.prefecture}
                      {lead.job.city ? ` ${lead.job.city}` : ""}
                    </span>
                  </div>
                )}

                {lead.experienceYears !== null && (
                  <p className="mt-1.5 text-xs text-gray-600">
                    建設業経験: {lead.experienceYears} 年
                  </p>
                )}
                {lead.notes && (
                  <div className="mt-2 border-l-2 border-gray-200 pl-2 text-xs text-gray-600 whitespace-pre-wrap">
                    {lead.notes}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/company/line-leads"
        searchParams={params}
      />

      {/* 補足 */}
      <p className="text-xs text-gray-400 leading-relaxed border-t pt-3">
        ※ LINE 応募者の選考状況は当社運営側で管理しています。応募者と直接やり取りされる場合は、
        電話 / メール / LINE のいずれかでご連絡ください。
      </p>
    </div>
  )
}

import Link from "next/link"
import { prisma } from "@/lib/db"
import { Pagination } from "@/components/pagination"
import { MessageCircle, Search, Download } from "lucide-react"
import {
  LEAD_STATUSES,
  LEAD_STATUS_META,
  isLeadStatus,
  type LeadStatus,
} from "@/lib/line-lead-status"
import { LeadRow, type LeadRowData } from "./lead-row"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "LINE リード管理",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<Record<string, string | undefined>>
}

const PER_PAGE = 30

export default async function AdminLineLeadsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page ?? "1"))
  const statusFilter = isLeadStatus(params.status) ? params.status : undefined
  const q = (params.q ?? "").trim()

  // 検索クエリ用 where
  const where = {
    ...(statusFilter && { status: statusFilter }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" as const } },
      ],
    }),
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
          lineUserId: true,
          lineDisplayName: true,
          optedOut: true,
          job: {
            select: { id: true, title: true, prefecture: true, city: true },
          },
        },
      })
      .catch(() => []),
    prisma.lineLead.count({ where }).catch(() => 0),
    prisma.lineLead
      .groupBy({
        by: ["status"],
        _count: true,
      })
      .catch(() => [] as Array<{ status: string; _count: number }>),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  // ステータス別件数を Record 化（fall back 0）
  const statusCountMap: Record<LeadStatus, number> = {
    pending: 0,
    line_added: 0,
    contacted: 0,
    qualified: 0,
    converted: 0,
    rejected: 0,
  }
  for (const sc of statusCounts) {
    if (isLeadStatus(sc.status)) {
      statusCountMap[sc.status] = sc._count
    }
  }
  const allCount = Object.values(statusCountMap).reduce((a, b) => a + b, 0)

  // 直近 24h / 7d の集計
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000)
  const [todayCount, weekCount] = await Promise.all([
    prisma.lineLead.count({ where: { createdAt: { gte: today } } }).catch(() => 0),
    prisma.lineLead
      .count({ where: { createdAt: { gte: sevenDaysAgo } } })
      .catch(() => 0),
  ])

  const rowData: LeadRowData[] = leads.map((l) => ({
    id: l.id,
    createdAt: l.createdAt.toISOString(),
    name: l.name,
    phone: l.phone,
    email: l.email,
    experienceYears: l.experienceYears,
    notes: l.notes,
    status: (isLeadStatus(l.status) ? l.status : "pending") as LeadStatus,
    lineUserId: l.lineUserId,
    lineDisplayName: l.lineDisplayName,
    optedOut: l.optedOut,
    job: l.job,
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <MessageCircle className="h-6 w-6 text-primary-500" />
            LINE リード管理
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            LINE 応募フォームから届いたリードの一覧。クリックで詳細展開 / ステータス変更 / メモを編集できます。
          </p>
        </div>
        <a
          href={`/api/admin/line-leads/export${buildExportQuery({ q, status: statusFilter })}`}
          className="press inline-flex items-center gap-1.5 border border-gray-300 bg-white hover:bg-gray-50 px-3 py-2 text-sm font-bold text-gray-700"
        >
          <Download className="h-4 w-4" />
          CSV エクスポート
        </a>
      </div>

      {/* サマリ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="本日" value={todayCount} accent />
        <StatCard label="直近 7 日間" value={weekCount} />
        <StatCard label="新規 (未対応)" value={statusCountMap.pending} />
        <StatCard label="累計" value={allCount} />
      </div>

      {/* フィルタ */}
      <form action="/admin/line-leads" className="border bg-white p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center gap-2 border border-gray-300 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400 shrink-0" />
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="氏名 / 電話 / メールで検索"
              className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
            />
          </div>
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          <button
            type="submit"
            className="press inline-flex items-center justify-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white"
          >
            <Search className="h-4 w-4" />
            検索
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatusChip
            href={buildHref({ q, status: undefined })}
            label={`すべて (${allCount})`}
            active={!statusFilter}
          />
          {LEAD_STATUSES.map((s) => (
            <StatusChip
              key={s}
              href={buildHref({ q, status: s })}
              label={`${LEAD_STATUS_META[s].label} (${statusCountMap[s]})`}
              active={statusFilter === s}
              classes={LEAD_STATUS_META[s].classes}
            />
          ))}
        </div>
      </form>

      {/* リード一覧 */}
      <div className="space-y-2">
        {rowData.length === 0 ? (
          <div className="border bg-white p-8 text-center text-sm text-gray-500">
            条件に合うリードが見つかりませんでした。
          </div>
        ) : (
          rowData.map((lead) => <LeadRow key={lead.id} lead={lead} />)
        )}
      </div>

      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/admin/line-leads"
        searchParams={params}
      />
    </div>
  )
}

function StatCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`border p-4 ${
        accent ? "bg-primary-50 border-primary-200" : "bg-white border-gray-200"
      }`}
    >
      <p className="text-xs font-bold text-gray-500">{label}</p>
      <p className={`mt-1 text-2xl font-black tabular-nums ${accent ? "text-primary-700" : "text-gray-900"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function StatusChip({
  href,
  label,
  active,
  classes,
}: {
  href: string
  label: string
  active: boolean
  classes?: string
}) {
  return (
    <Link
      href={href}
      className={`press inline-flex items-center px-2.5 py-1 text-xs font-bold border transition ${
        active
          ? "bg-ink-900 text-white border-ink-900"
          : classes ?? "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  )
}

function buildHref(params: { q?: string; status?: LeadStatus | undefined }): string {
  const url = new URLSearchParams()
  if (params.q) url.set("q", params.q)
  if (params.status) url.set("status", params.status)
  const qs = url.toString()
  return qs ? `/admin/line-leads?${qs}` : "/admin/line-leads"
}

function buildExportQuery(params: { q?: string; status?: LeadStatus | undefined }): string {
  const url = new URLSearchParams()
  if (params.q) url.set("q", params.q)
  if (params.status) url.set("status", params.status)
  const qs = url.toString()
  return qs ? `?${qs}` : ""
}

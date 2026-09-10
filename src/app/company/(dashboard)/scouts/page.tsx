/**
 * 12.x 企業 スカウト送信履歴一覧。
 *
 * 自社が送信したスカウトを新しい順に表示。
 * ステータス (sent / read / expired / declined) でフィルタ可能。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isScoutEffectivelyExpired } from "@/lib/scouts"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Mail, MailOpen, Clock, XCircle, Send } from "lucide-react"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "スカウト送信履歴",
}

const STATUS_CONFIG: Record<
  string,
  { label: string; className: string; icon: typeof Mail }
> = {
  sent: { label: "未読", className: "bg-amber-100 text-amber-700", icon: Mail },
  read: { label: "既読", className: "bg-green-100 text-green-700", icon: MailOpen },
  expired: { label: "期限切れ", className: "bg-gray-100 text-gray-500", icon: Clock },
  declined: { label: "辞退", className: "bg-red-100 text-red-700", icon: XCircle },
}

export default async function CompanyScoutsPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")
  const role = (session.user as { role?: string }).role
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")
  if (role !== "company_admin" && role !== "company_member") redirect("/login")

  const scoutRows = await prisma.scoutMessage.findMany({
    where: { companyId },
    orderBy: { sentAt: "desc" },
    take: 100,
    select: {
      id: true,
      subject: true,
      status: true,
      sentAt: true,
      readAt: true,
      expiresAt: true,
      job: { select: { id: true, title: true } },
      user: { select: { id: true, name: true } },
    },
  })

  // 日次 cron (expire-scouts) がまだ status="expired" に更新していない
  // 期限切れ直後のスカウトも「対応中」に見えてしまわないよう、表示上の
  // status を expiresAt ベースで補正する。
  const scouts = scoutRows.map((s) => ({
    ...s,
    status: isScoutEffectivelyExpired(s) ? "expired" : s.status,
  }))

  const stats = {
    total: scouts.length,
    sent: scouts.filter((s) => s.status === "sent").length,
    read: scouts.filter((s) => s.status === "read").length,
    declined: scouts.filter((s) => s.status === "declined").length,
    expired: scouts.filter((s) => s.status === "expired").length,
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-ink-900 tracking-tight">
            スカウト送信履歴
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            自社から送信したスカウトの一覧です。
          </p>
        </div>
        <Link
          href="/company/interests"
          className="inline-flex shrink-0 items-center gap-1 bg-primary-600 px-4 py-2 text-sm font-bold text-white hover:bg-primary-700"
        >
          <Send className="h-4 w-4" />
          気になる候補から送信
        </Link>
      </div>

      {/* サマリー */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatCard label="送信総数" value={stats.total} />
        <StatCard label="未読" value={stats.sent} />
        <StatCard label="既読" value={stats.read} />
        <StatCard label="辞退" value={stats.declined} />
        <StatCard label="期限切れ" value={stats.expired} />
      </div>

      {scouts.length === 0 ? (
        <div className="mt-8 border border-dashed border-gray-300 bg-warm-50 p-8 text-center">
          <Send className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-sm text-gray-500">まだスカウトを送信していません</p>
          <p className="mt-1 text-xs text-gray-400">
            「気になる候補」ページから求職者にスカウトを送信できます。
          </p>
          <Link
            href="/company/interests"
            className="mt-4 inline-block bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            気になる候補を見る
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-2">
          {scouts.map((s) => {
            const sc = STATUS_CONFIG[s.status]
            const Icon = sc.icon
            return (
              <li
                key={s.id}
                className="flex items-start gap-3 border border-warm-200 bg-white p-4"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center ${sc.className}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold ${sc.className}`}
                    >
                      {sc.label}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDate(s.sentAt)} 送信
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-ink-900 truncate">
                    {s.user?.name ?? "求職者"} 様
                  </p>
                  <p className="text-sm text-gray-500 truncate">
                    {s.job?.title ?? "求人情報"} ・ 期限 {formatDate(s.expiresAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-warm-200 bg-white p-3 text-center">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-black text-ink-900">{value}</p>
    </div>
  )
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}/${(d.getMonth() + 1)
    .toString()
    .padStart(2, "0")}/${d.getDate().toString().padStart(2, "0")}`
}

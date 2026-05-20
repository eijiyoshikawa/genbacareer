/**
 * 15.6 採用決定ボーナス admin 管理画面。
 * 申請 → 承認 → 支払済 のワークフロー進行。
 */

import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { Gift } from "lucide-react"
import Link from "next/link"
import { BonusActions } from "./actions"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "採用決定ボーナス",
}

const STATUS_LABEL: Record<string, string> = {
  requested: "申請中",
  approved: "承認済",
  paid: "支払済",
  rejected: "却下",
}
const STATUS_STYLE: Record<string, string> = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-700",
}

const METHOD_LABEL: Record<string, string> = {
  amazon_gift: "Amazon ギフト",
  bank_transfer: "銀行振込",
  cash: "現金",
}

type SearchParams = Promise<{ status?: string }>

export default async function AdminHiringBonusesPage(props: {
  searchParams: SearchParams
}) {
  const { status } = await props.searchParams
  const filter =
    status === "approved" || status === "paid" || status === "rejected"
      ? status
      : "requested"

  const [items, requestedCount, approvedCount, paidCount, rejectedCount] =
    await Promise.all([
      prisma.hiringBonus.findMany({
        where: { status: filter },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.hiringBonus.count({ where: { status: "requested" } }),
      prisma.hiringBonus.count({ where: { status: "approved" } }),
      prisma.hiringBonus.count({ where: { status: "paid" } }),
      prisma.hiringBonus.count({ where: { status: "rejected" } }),
    ])

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Gift className="h-6 w-6 text-rose-500" />
        採用決定ボーナス
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        採用決定後に求職者へ支払うお祝い金の申請・承認・支払い管理。
      </p>

      <div className="mt-6 flex gap-2 border-b border-gray-200 flex-wrap">
        {(
          [
            { v: "requested", label: `申請中 (${requestedCount})` },
            { v: "approved", label: `承認済 (${approvedCount})` },
            { v: "paid", label: `支払済 (${paidCount})` },
            { v: "rejected", label: `却下 (${rejectedCount})` },
          ] as const
        ).map((tab) => (
          <a
            key={tab.v}
            href={`/admin/hiring-bonuses?status=${tab.v}`}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              filter === tab.v
                ? "border-rose-600 text-rose-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {items.length === 0 ? (
          <li className="border bg-white p-8 text-center text-sm text-gray-500">
            該当する申請はありません。
          </li>
        ) : (
          items.map((b) => (
            <li key={b.id} className="border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[b.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    <span className="text-xl font-extrabold tabular-nums text-rose-600">
                      ¥{b.amount.toLocaleString()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {METHOD_LABEL[b.payoutMethod] ?? b.payoutMethod}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    申請: {b.createdAt.toLocaleString("ja-JP")}
                    {" · "}
                    <Link
                      href={`/admin/users?id=${b.userId}`}
                      className="text-primary-600 hover:underline"
                    >
                      ユーザー
                    </Link>
                    {" · "}
                    <Link
                      href={`/admin/companies/${b.companyId}`}
                      className="text-primary-600 hover:underline"
                    >
                      企業
                    </Link>
                  </p>
                  {b.requestNote && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap mt-2">
                      <span className="font-bold">申請メモ: </span>
                      {b.requestNote}
                    </p>
                  )}
                  {b.payoutDetails && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-bold">支払先: </span>
                      <code className="text-[11px]">
                        {JSON.stringify(b.payoutDetails)}
                      </code>
                    </p>
                  )}
                  {b.rejectionReason && (
                    <p className="text-sm text-rose-700 mt-1">
                      却下理由: {b.rejectionReason}
                    </p>
                  )}
                  {b.approvedAt && (
                    <p className="text-xs text-blue-700">
                      承認: {b.approvedAt.toLocaleString("ja-JP")}
                    </p>
                  )}
                  {b.paidAt && (
                    <p className="text-xs text-green-700">
                      支払: {b.paidAt.toLocaleString("ja-JP")}
                    </p>
                  )}
                </div>
                <BonusActions bonusId={b.id} status={b.status} />
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

/**
 * Admin: 早期退職 (戻入) 申請一覧。
 *
 * status='reported' を上位に出し、承認 / 却下できる。
 */

import { prisma } from "@/lib/db"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { EarlyResignationActions } from "./actions"

export const metadata: Metadata = {
  title: "戻入申請",
}

export const dynamic = "force-dynamic"

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  reported: { text: "申請中", className: "bg-amber-100 text-amber-800" },
  approved: { text: "承認済", className: "bg-green-100 text-green-800" },
  rejected: { text: "却下", className: "bg-red-100 text-red-800" },
  invoiced: { text: "返金処理済", className: "bg-blue-100 text-blue-800" },
}

export default async function AdminEarlyResignationsPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") redirect("/login")

  const [rows, summary] = await Promise.all([
    prisma.earlyResignation.findMany({
      orderBy: [
        // reported を先頭に
        { status: "asc" },
        { createdAt: "desc" },
      ],
      take: 200,
      select: {
        id: true,
        status: true,
        hiredAt: true,
        resignedAt: true,
        monthsAfterHire: true,
        refundRate: true,
        refundAmount: true,
        originalFeeAmount: true,
        companyNote: true,
        adminNote: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        user: { select: { name: true } },
        job: { select: { title: true } },
      },
    }),
    prisma.earlyResignation.groupBy({
      by: ["status"],
      _count: true,
      _sum: { refundAmount: true },
    }),
  ])

  const counts: Record<string, number> = {}
  let totalRefundApprovedOrInvoiced = 0
  for (const s of summary) {
    counts[s.status] = s._count
    if (s.status === "approved" || s.status === "invoiced") {
      totalRefundApprovedOrInvoiced += s._sum.refundAmount ?? 0
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">早期退職 (戻入) 申請</h1>
      <p className="mt-1 text-sm text-gray-500">
        企業が報告した採用後 3 ヶ月以内の退職に対する成果報酬の戻入処理。
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="申請中" value={counts.reported ?? 0} />
        <Stat label="承認済" value={counts.approved ?? 0} />
        <Stat label="却下" value={counts.rejected ?? 0} />
        <Stat label="返金処理済" value={counts.invoiced ?? 0} />
      </div>
      <p className="mt-2 text-xs text-gray-500">
        承認以降の累計返金額: ¥{totalRefundApprovedOrInvoiced.toLocaleString()}
      </p>

      {rows.length === 0 ? (
        <div className="mt-6 border bg-warm-50 p-6 text-center text-sm text-gray-600">
          戻入申請はありません。
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => {
            const status = STATUS_LABEL[r.status] ?? {
              text: r.status,
              className: "bg-gray-100 text-gray-800",
            }
            return (
              <li key={r.id} className="border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-bold ${status.className}`}
                    >
                      {status.text}
                    </span>
                    <p className="mt-2 font-bold text-gray-900">
                      <Link
                        href={`/admin/companies/${r.company.id}`}
                        className="hover:underline"
                      >
                        {r.company.name}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-600">
                      {r.job.title} ・ {r.user.name ?? "求職者"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-xs text-gray-500">
                      入社:{" "}
                      {r.hiredAt.toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}{" "}
                      → 退職:{" "}
                      {r.resignedAt.toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      })}
                    </p>
                    <p className="mt-1">
                      入社後{" "}
                      <strong className="text-red-700">
                        {r.monthsAfterHire} ヶ月
                      </strong>{" "}
                      ・ 返金率{" "}
                      <strong className="text-amber-700">{r.refundRate}%</strong>
                    </p>
                    <p className="mt-1 text-lg font-bold text-amber-700">
                      ¥{r.refundAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      元: ¥{r.originalFeeAmount.toLocaleString()}
                    </p>
                  </div>
                </div>

                {r.companyNote && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-bold text-gray-500">企業コメント</p>
                    <p className="mt-1 text-sm whitespace-pre-line text-gray-700">
                      {r.companyNote}
                    </p>
                  </div>
                )}

                {r.adminNote && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-xs font-bold text-gray-500">admin メモ</p>
                    <p className="mt-1 text-sm whitespace-pre-line text-gray-700">
                      {r.adminNote}
                    </p>
                  </div>
                )}

                {/* アクション (reported / approved のときのみ) */}
                {(r.status === "reported" || r.status === "approved") && (
                  <div className="mt-3 border-t pt-3">
                    <EarlyResignationActions id={r.id} status={r.status} />
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border bg-white p-3 text-center shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
    </div>
  )
}

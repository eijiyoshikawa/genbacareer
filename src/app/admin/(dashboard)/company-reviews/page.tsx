/**
 * 12.2 企業口コミ モデレーション画面 (admin)。
 *
 * status=pending を未承認として一覧、approve / reject で公開判定。
 * 公開済み (approved) も切替表示。
 */

import { prisma } from "@/lib/db"
import type { Metadata } from "next"
import { MessageSquare } from "lucide-react"
import Link from "next/link"
import { ReviewModerationActions } from "./moderation-actions"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "企業口コミ モデレーション",
}

const STATUS_TAGS: Record<string, string> = {
  pending: "未対応",
  approved: "公開中",
  rejected: "非公開",
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-green-100 text-green-800",
  rejected: "bg-gray-100 text-gray-700",
}

type SearchParams = Promise<{ status?: string }>

export default async function AdminCompanyReviewsPage(props: {
  searchParams: SearchParams
}) {
  const { status } = await props.searchParams
  const filter =
    status === "approved" || status === "rejected" ? status : "pending"

  const [reviews, pendingCount, approvedCount, rejectedCount] = await Promise.all([
    prisma.companyReview.findMany({
      where: { status: filter },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { company: { select: { id: true, name: true } } },
    }),
    prisma.companyReview.count({ where: { status: "pending" } }),
    prisma.companyReview.count({ where: { status: "approved" } }),
    prisma.companyReview.count({ where: { status: "rejected" } }),
  ])

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <MessageSquare className="h-6 w-6 text-primary-500" />
        企業口コミ モデレーション
      </h1>

      <div className="mt-6 flex gap-2 border-b border-gray-200">
        {(
          [
            { v: "pending", label: `未対応 (${pendingCount})` },
            { v: "approved", label: `公開中 (${approvedCount})` },
            { v: "rejected", label: `非公開 (${rejectedCount})` },
          ] as const
        ).map((tab) => (
          <a
            key={tab.v}
            href={`/admin/company-reviews?status=${tab.v}`}
            className={`border-b-2 px-4 py-2 text-sm font-medium transition ${
              filter === tab.v
                ? "border-primary-600 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </a>
        ))}
      </div>

      <ul className="mt-6 space-y-3">
        {reviews.length === 0 ? (
          <li className="border bg-white p-8 text-center text-sm text-gray-500">
            該当する口コミはありません。
          </li>
        ) : (
          reviews.map((r) => (
            <li key={r.id} className="border bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="space-y-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium ${
                        STATUS_STYLE[r.status] ?? "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {STATUS_TAGS[r.status] ?? r.status}
                    </span>
                    <span className="text-amber-600 text-sm">
                      {"★".repeat(r.rating)}
                      {"☆".repeat(5 - r.rating)}
                    </span>
                    <Link
                      href={`/companies/${r.company.id}`}
                      className="text-sm text-primary-700 hover:underline"
                    >
                      {r.company.name}
                    </Link>
                  </div>
                  {r.title && (
                    <p className="font-bold text-gray-900">{r.title}</p>
                  )}
                  {r.goodPoints && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      <span className="font-bold text-green-700">良い: </span>
                      {r.goodPoints}
                    </p>
                  )}
                  {r.badPoints && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      <span className="font-bold text-rose-700">悪い: </span>
                      {r.badPoints}
                    </p>
                  )}
                  {r.advice && (
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">
                      <span className="font-bold text-primary-700">アドバイス: </span>
                      {r.advice}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    {r.displayName ?? "建設業界の方"} ·
                    {" "}
                    {r.employmentStatus} ·
                    {" "}
                    {r.createdAt.toLocaleString("ja-JP")}
                    {r.reporterIp && <> · IP: {r.reporterIp}</>}
                  </p>
                </div>
                {r.status === "pending" && (
                  <ReviewModerationActions reviewId={r.id} />
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}

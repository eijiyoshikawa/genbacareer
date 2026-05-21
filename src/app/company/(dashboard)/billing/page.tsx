import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { HIRING_FEE_AMOUNT } from "@/lib/stripe"
import { resolveHiringFee } from "@/lib/hiring-fee"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "課金履歴",
}

export default async function CompanyBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) redirect("/login")

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const perPage = 20

  const [events, total, summaryData, companyJobs] = await Promise.all([
    prisma.billingEvent.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        application: {
          include: {
            job: { select: { title: true, hiringFeeAmount: true } },
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.billingEvent.count({ where: { companyId } }),
    prisma.billingEvent.groupBy({
      by: ["status"],
      where: { companyId },
      _sum: { amount: true },
      _count: true,
    }),
    // 求人ごとの単価範囲を計算するために active 求人の hiringFeeAmount を取得
    prisma.job.findMany({
      where: { companyId, status: "active" },
      select: { hiringFeeAmount: true },
    }),
  ])

  // 求人別の単価レンジ表示（個別設定が混在しているケースの可視化）
  const feeAmounts = companyJobs.map((j) => resolveHiringFee(j))
  const feeMin = feeAmounts.length > 0 ? Math.min(...feeAmounts) : HIRING_FEE_AMOUNT
  const feeMax = feeAmounts.length > 0 ? Math.max(...feeAmounts) : HIRING_FEE_AMOUNT
  const feeIsRange = feeMin !== feeMax

  const totalPages = Math.ceil(total / perPage)

  const totalPaid =
    summaryData.find((s) => s.status === "paid")?._sum.amount ?? 0
  const totalPending =
    summaryData.find((s) => s.status === "pending")?._sum.amount ??
    0 +
      (summaryData.find((s) => s.status === "invoiced")?._sum.amount ?? 0)
  const totalHired = summaryData.reduce((sum, s) => sum + s._count, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">課金履歴</h1>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <div className="border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">成果報酬単価</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {feeIsRange
              ? `¥${feeMin.toLocaleString()} 〜 ¥${feeMax.toLocaleString()}`
              : `¥${feeMin.toLocaleString()}`}
          </p>
          <p className="text-xs text-gray-400">
            {feeIsRange ? "求人ごとに異なる" : "1採用あたり"}
          </p>
        </div>
        <div className="border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">支払い済み</p>
          <p className="mt-1 text-2xl font-bold text-green-600">
            ¥{totalPaid.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">
            {summaryData.find((s) => s.status === "paid")?._count ?? 0} 件
          </p>
        </div>
        <div className="border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">未払い</p>
          <p className="mt-1 text-2xl font-bold text-yellow-600">
            ¥{totalPending.toLocaleString()}
          </p>
          <p className="text-xs text-gray-400">合計 {totalHired} 件の採用</p>
        </div>
      </div>

      {/* Events table */}
      {events.length === 0 ? (
        <div className="mt-8 border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">課金履歴はまだありません。</p>
          <p className="mt-1 text-sm text-gray-400">
            応募者のステータスを「採用」に変更すると、成果報酬が自動的に発生します。
          </p>
        </div>
      ) : (
        <div className="mt-6 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  求人
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  採用者
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  金額
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  ステータス
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                  日付
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {event.application.job.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {event.application.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ¥{event.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <BillingStatusBadge status={event.status} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-500">
                    {event.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <a
              key={p}
              href={`/company/billing?page=${p}`}
              className={` px-3 py-1 text-sm ${
                p === page
                  ? "bg-primary-600 text-white"
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

function BillingStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string }> = {
    pending: { label: "処理中", className: "bg-yellow-100 text-yellow-700" },
    invoiced: { label: "請求済み", className: "bg-primary-100 text-primary-700" },
    paid: { label: "支払い済み", className: "bg-green-100 text-green-700" },
    failed: { label: "失敗", className: "bg-red-100 text-red-600" },
  }

  const { label, className } = config[status] ?? {
    label: status,
    className: "bg-gray-100 text-gray-600",
  }

  return (
    <span
      className={`inline-flex px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

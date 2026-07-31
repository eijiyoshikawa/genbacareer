import { prisma } from "@/lib/db"
import { parsePage } from "@/lib/pagination"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "課金管理",
}

export default async function AdminBillingPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>
}) {
  const params = await searchParams
  const page = parsePage(params.page)
  const statusFilter = params.status || "all"
  const perPage = 20

  const where = statusFilter !== "all" ? { status: statusFilter } : {}

  const [events, total, summaryData] = await Promise.all([
    prisma.billingEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        company: { select: { name: true } },
        application: {
          include: {
            job: { select: { title: true } },
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.billingEvent.count({ where }),
    prisma.billingEvent.groupBy({
      by: ["status"],
      _sum: { amount: true },
      _count: true,
    }),
  ])

  const totalPages = Math.ceil(total / perPage)

  const paid = summaryData.find((s) => s.status === "paid")
  const invoiced = summaryData.find((s) => s.status === "invoiced")
  const pending = summaryData.find((s) => s.status === "pending")
  const failed = summaryData.find((s) => s.status === "failed")

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">課金管理</h1>

      {/* Summary */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <SummaryCard label="支払い済み" amount={paid?._sum.amount ?? 0} count={paid?._count ?? 0} className="text-green-600" />
        <SummaryCard label="請求済み" amount={invoiced?._sum.amount ?? 0} count={invoiced?._count ?? 0} className="text-primary-600" />
        <SummaryCard label="処理中" amount={pending?._sum.amount ?? 0} count={pending?._count ?? 0} className="text-yellow-600" />
        <SummaryCard label="失敗" amount={failed?._sum.amount ?? 0} count={failed?._count ?? 0} className="text-red-600" />
      </div>

      {/* Status filter */}
      <div className="mt-6 flex flex-wrap gap-2">
        {[
          { value: "all", label: "すべて" },
          { value: "paid", label: "支払い済み" },
          { value: "invoiced", label: "請求済み" },
          { value: "pending", label: "処理中" },
          { value: "failed", label: "失敗" },
        ].map((opt) => (
          <Link
            key={opt.value}
            href={`/admin/billing?status=${opt.value}`}
            className={` px-3 py-1 text-sm font-medium ${
              statusFilter === opt.value
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      {events.length === 0 ? (
        <div className="mt-6 border bg-white p-8 text-center shadow-sm">
          <p className="text-gray-500">課金イベントはありません。</p>
        </div>
      ) : (
        <div className="mt-4 overflow-hidden border bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">企業</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">求人</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">採用者</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">金額</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">支払方法</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ステータス</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">日付</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {event.company.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {event.application.job.title}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {event.application.user?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    ¥{event.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {event.provider === "moneyforward" ? "マネフォ" : event.provider}
                    {event.invoiceUrl && (
                      <>
                        {" · "}
                        <a
                          href={event.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 underline"
                        >
                          請求書
                        </a>
                      </>
                    )}
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

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/billing?status=${statusFilter}&page=${p}`}
              className={` px-3 py-1 text-sm ${
                p === page
                  ? "bg-primary-600 text-white"
                  : "bg-white text-gray-600 border hover:bg-gray-50"
              }`}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryCard({
  label,
  amount,
  count,
  className,
}: {
  label: string
  amount: number
  count: number
  className: string
}) {
  return (
    <div className="border bg-white p-4 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${className}`}>
        ¥{amount.toLocaleString()}
      </p>
      <p className="text-xs text-gray-400">{count} 件</p>
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
  const { label, className } = config[status] ?? { label: status, className: "bg-gray-100 text-gray-600" }
  return (
    <span className={`inline-flex px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}

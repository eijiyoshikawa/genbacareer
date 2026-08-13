/**
 * Admin: 請求書発行待ちタスクリスト (MoneyForward 連携の人手代替)。
 *
 * 表示対象:
 *   A. BillingEvent.status = 'pending'
 *      → 採用確定 (Application.status = 'hired') 直後の未請求成果報酬
 *      → admin が MF クラウド請求書で発行 → 「発行済をマーク」する
 *
 *   B. BillingEvent.status = 'invoiced'
 *      → 請求書発行済だが未入金。入金確認後「入金済をマーク」する
 *
 *   C. EarlyResignation.status = 'approved'
 *      → admin 承認済の戻入だが credit note 未発行
 *      → MF で credit note 発行 → /admin/early-resignations で「返金処理済」マーク
 *
 *   D. BillingEvent.status = 'failed'
 *      → MoneyForward 送信が失敗した成果報酬請求（要対応・要注意）
 *      → 「MFで再試行」で自動リトライ、それでも失敗する場合は MF 側で手動発行して
 *        「発行済をマーク」
 *
 * 各エントリに金額を併記し、企業別に小計を取る。
 */

import { prisma } from "@/lib/db"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import type { Metadata } from "next"
import { FileText, CheckCircle, RefreshCcw, AlertTriangle } from "lucide-react"
import { MarkBillingButton } from "./mark-billing-button"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "請求書発行待ち",
}

export default async function AdminBillingTodoPage() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") redirect("/login")

  const [pending, invoiced, refundApproved, failed] = await Promise.all([
    // A. 採用確定 → 請求書未発行
    prisma.billingEvent.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        application: {
          select: {
            id: true,
            hiredAt: true,
            user: { select: { name: true } },
            job: { select: { title: true } },
          },
        },
      },
    }),
    // B. 発行済 → 入金待ち
    prisma.billingEvent.findMany({
      where: { status: "invoiced" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        mfBillingId: true,
        invoiceUrl: true,
        company: { select: { id: true, name: true } },
        application: {
          select: {
            id: true,
            user: { select: { name: true } },
            job: { select: { title: true } },
          },
        },
      },
    }),
    // C. 戻入承認済 → credit note 未発行
    prisma.earlyResignation.findMany({
      where: { status: "approved" },
      orderBy: { approvedAt: "asc" },
      select: {
        id: true,
        refundAmount: true,
        refundRate: true,
        monthsAfterHire: true,
        approvedAt: true,
        company: { select: { id: true, name: true } },
        user: { select: { name: true } },
        job: { select: { title: true } },
      },
    }),
    // D. MoneyForward 送信失敗 → 要対応
    prisma.billingEvent.findMany({
      where: { status: "failed" },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        createdAt: true,
        company: { select: { id: true, name: true } },
        application: {
          select: {
            id: true,
            hiredAt: true,
            user: { select: { name: true } },
            job: { select: { title: true } },
          },
        },
      },
    }),
  ])

  const pendingTotal = pending.reduce((sum, r) => sum + r.amount, 0)
  const invoicedTotal = invoiced.reduce((sum, r) => sum + r.amount, 0)
  const refundTotal = refundApproved.reduce((sum, r) => sum + r.refundAmount, 0)
  const failedTotal = failed.reduce((sum, r) => sum + r.amount, 0)

  // 企業別小計 (pending のみ、ダッシュボードに出すため)
  const byCompany = new Map<string, { name: string; total: number; count: number }>()
  for (const r of pending) {
    const key = r.company.id
    const prev = byCompany.get(key) ?? { name: r.company.name, total: 0, count: 0 }
    byCompany.set(key, {
      name: prev.name,
      total: prev.total + r.amount,
      count: prev.count + 1,
    })
  }
  const companyBreakdown = Array.from(byCompany.entries())
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.total - a.total)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">請求書発行待ち</h1>
      <p className="mt-1 text-sm text-gray-500">
        MoneyForward クラウド請求書で実発行するべきタスクの一覧です。
        発行後は各エントリの「発行済をマーク」をクリックしてください。
      </p>

      {/* サマリー */}
      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <StatCard
          icon={<FileText className="h-5 w-5 text-amber-700" />}
          label="請求書発行待ち"
          amount={pendingTotal}
          count={pending.length}
          className="border-amber-300 bg-amber-50"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5 text-blue-700" />}
          label="発行済 (入金待ち)"
          amount={invoicedTotal}
          count={invoiced.length}
          className="border-blue-300 bg-blue-50"
        />
        <StatCard
          icon={<RefreshCcw className="h-5 w-5 text-red-700" />}
          label="戻入 credit note 待ち"
          amount={refundTotal}
          count={refundApproved.length}
          className="border-red-300 bg-red-50"
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-purple-700" />}
          label="請求失敗（要対応）"
          amount={failedTotal}
          count={failed.length}
          className="border-purple-300 bg-purple-50"
        />
      </div>

      {/* 企業別小計 */}
      {companyBreakdown.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-bold text-gray-900">
            企業別 請求書発行待ち小計
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            同一企業で複数の採用確定がある場合、まとめて 1 通の請求書にすると効率的です。
          </p>
          <ul className="mt-3 divide-y bg-white border shadow-sm">
            {companyBreakdown.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between px-4 py-3"
              >
                <div>
                  <Link
                    href={`/admin/companies/${c.id}`}
                    className="font-bold text-gray-900 hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className="text-xs text-gray-500">{c.count} 件の採用</p>
                </div>
                <p className="text-lg font-bold text-amber-700">
                  ¥{c.total.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* A. pending */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">
          <FileText className="mr-2 inline-block h-5 w-5 text-amber-700" />
          A. 請求書発行待ち ({pending.length} 件)
        </h2>
        {pending.length === 0 ? (
          <div className="mt-3 border bg-warm-50 p-6 text-center text-sm text-gray-500">
            すべて発行済みです。
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {pending.map((r) => (
              <li key={r.id} className="border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">
                      <Link
                        href={`/admin/companies/${r.company.id}`}
                        className="hover:underline"
                      >
                        {r.company.name}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-500">
                      採用者: {r.application.user.name ?? "—"} ・ 求人:{" "}
                      {r.application.job?.title ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      採用確定:{" "}
                      {r.application.hiredAt?.toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      }) ?? "—"}
                      {" / "}
                      請求発生: {r.createdAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-amber-700">
                      ¥{r.amount.toLocaleString()}
                    </p>
                    <MarkBillingButton id={r.id} action="mark_invoiced" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* B. invoiced */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">
          <CheckCircle className="mr-2 inline-block h-5 w-5 text-blue-700" />
          B. 発行済 (入金待ち) ({invoiced.length} 件)
        </h2>
        {invoiced.length === 0 ? (
          <div className="mt-3 border bg-warm-50 p-6 text-center text-sm text-gray-500">
            入金待ちはありません。
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {invoiced.map((r) => (
              <li key={r.id} className="border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">{r.company.name}</p>
                    <p className="text-sm text-gray-500">
                      採用者: {r.application.user.name ?? "—"} ・ 求人:{" "}
                      {r.application.job?.title ?? "—"}
                    </p>
                    {r.mfBillingId && (
                      <p className="text-xs text-gray-400">
                        MF 請求書 ID: {r.mfBillingId}
                      </p>
                    )}
                    {r.invoiceUrl && (
                      <p className="text-xs">
                        <a
                          href={r.invoiceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline"
                        >
                          請求書 PDF を開く
                        </a>
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-blue-700">
                      ¥{r.amount.toLocaleString()}
                    </p>
                    <MarkBillingButton id={r.id} action="mark_paid" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* C. refund approved */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">
          <RefreshCcw className="mr-2 inline-block h-5 w-5 text-red-700" />
          C. 戻入 credit note 発行待ち ({refundApproved.length} 件)
        </h2>
        {refundApproved.length === 0 ? (
          <div className="mt-3 border bg-warm-50 p-6 text-center text-sm text-gray-500">
            戻入の発行待ちはありません。
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {refundApproved.map((r) => (
              <li key={r.id} className="border bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">{r.company.name}</p>
                    <p className="text-sm text-gray-500">
                      退職者: {r.user.name ?? "—"} ・ 求人: {r.job.title}
                    </p>
                    <p className="text-xs text-gray-400">
                      入社後 {r.monthsAfterHire} ヶ月 / 返金率 {r.refundRate}% /
                      承認日:{" "}
                      {r.approvedAt?.toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      }) ?? "—"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xl font-bold text-red-700">
                      ¥{r.refundAmount.toLocaleString()}
                    </p>
                    <Link
                      href="/admin/early-resignations"
                      className="mt-1 inline-block text-xs text-primary-600 hover:underline"
                    >
                      → 戻入申請ページで処理
                    </Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* D. failed */}
      <section className="mt-10">
        <h2 className="text-lg font-bold text-gray-900">
          <AlertTriangle className="mr-2 inline-block h-5 w-5 text-purple-700" />
          D. 請求失敗（要対応） ({failed.length} 件)
        </h2>
        {failed.length === 0 ? (
          <div className="mt-3 border bg-warm-50 p-6 text-center text-sm text-gray-500">
            請求失敗はありません。
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {failed.map((r) => (
              <li key={r.id} className="border border-purple-300 bg-purple-50 p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-gray-900">
                      <Link
                        href={`/admin/companies/${r.company.id}`}
                        className="hover:underline"
                      >
                        {r.company.name}
                      </Link>
                    </p>
                    <p className="text-sm text-gray-500">
                      採用者: {r.application.user.name ?? "—"} ・ 求人:{" "}
                      {r.application.job?.title ?? "—"}
                    </p>
                    <p className="text-xs text-gray-400">
                      採用確定:{" "}
                      {r.application.hiredAt?.toLocaleDateString("ja-JP", {
                        timeZone: "Asia/Tokyo",
                      }) ?? "—"}
                      {" / "}
                      請求発生: {r.createdAt.toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <p className="text-xl font-bold text-purple-700">
                      ¥{r.amount.toLocaleString()}
                    </p>
                    <MarkBillingButton id={r.id} action="retry" />
                    <MarkBillingButton id={r.id} action="mark_invoiced" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  amount,
  count,
  className,
}: {
  icon: React.ReactNode
  label: string
  amount: number
  count: number
  className?: string
}) {
  return (
    <div className={`border p-4 shadow-sm ${className}`}>
      <div className="flex items-center gap-2">
        {icon}
        <p className="text-sm font-bold text-gray-700">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">
        ¥{amount.toLocaleString()}
      </p>
      <p className="text-xs text-gray-500">{count} 件</p>
    </div>
  )
}

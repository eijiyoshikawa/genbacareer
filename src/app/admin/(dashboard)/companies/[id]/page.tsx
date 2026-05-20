import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { CompanyApprovalActions } from "./approval-actions"
import { PaymentMethodSelector } from "./payment-method-selector"
import { InvitationManager } from "./invitation-manager"

export const metadata: Metadata = {
  title: "企業詳細",
}

const STATUS_LABEL: Record<string, { text: string; className: string }> = {
  pending: { text: "申請中", className: "bg-yellow-100 text-yellow-800" },
  approved: { text: "承認済", className: "bg-green-100 text-green-800" },
  rejected: { text: "却下", className: "bg-red-100 text-red-800" },
}

export default async function AdminCompanyDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<Record<string, string | undefined>>
}) {
  const { id } = await params
  const sp = (await searchParams) ?? {}
  const justCreated = sp.created === "1"

  const company = await prisma.company.findUnique({
    where: { id },
    include: {
      companyUsers: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          mustChangePassword: true,
          createdAt: true,
        },
      },
      _count: { select: { jobs: true, applications: true } },
    },
  })

  if (!company) notFound()

  const pendingInvitations = await prisma.companyInvitation.findMany({
    where: { companyId: id, acceptedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  const status = STATUS_LABEL[company.status] ?? STATUS_LABEL.pending

  return (
    <div className="space-y-6">
      {justCreated && (
        <div className="border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-900">
          企業を登録しました。下記の「ログイン情報を発行」から担当者を招待してください。
        </div>
      )}
      <div>
        <Link
          href="/admin/companies"
          className="text-sm text-primary-600 hover:underline"
        >
          ← 企業一覧へ
        </Link>
        <div className="mt-2 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              ID: {company.id}
            </p>
          </div>
          <span
            className={`inline-flex items-center px-3 py-1 text-sm font-medium ${status.className}`}
          >
            {status.text}
          </span>
        </div>
      </div>

      {/* Approval actions */}
      <div className="border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-gray-900">承認操作</h2>
        <p className="mt-1 text-sm text-gray-500">
          現在のステータス: <strong>{status.text}</strong>
        </p>
        <CompanyApprovalActions
          companyId={company.id}
          status={company.status}
          rejectionReason={company.rejectionReason}
        />
      </div>

      {/* Payment method */}
      <div className="border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-gray-900">支払方法</h2>
        <p className="mt-1 text-sm text-gray-500">
          採用確定時の請求書発行先プロバイダを選択してください。
        </p>
        <PaymentMethodSelector
          companyId={company.id}
          currentMethod={company.paymentMethod}
        />
      </div>

      {/* Company info */}
      <div className="border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-gray-900">基本情報</h2>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
          <div>
            <dt className="text-gray-500">業種</dt>
            <dd className="text-gray-900">{company.industry ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">都道府県</dt>
            <dd className="text-gray-900">{company.prefecture ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">担当メール</dt>
            <dd className="text-gray-900">{company.contactEmail ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-gray-500">登録日</dt>
            <dd className="text-gray-900">
              {company.createdAt.toLocaleString("ja-JP")}
            </dd>
          </div>
          {company.approvedAt && (
            <div>
              <dt className="text-gray-500">承認日</dt>
              <dd className="text-gray-900">
                {company.approvedAt.toLocaleString("ja-JP")}
              </dd>
            </div>
          )}
          {company.rejectedAt && (
            <div>
              <dt className="text-gray-500">却下日</dt>
              <dd className="text-gray-900">
                {company.rejectedAt.toLocaleString("ja-JP")}
              </dd>
            </div>
          )}
          {company.rejectionReason && (
            <div className="sm:col-span-2">
              <dt className="text-gray-500">却下理由</dt>
              <dd className="text-gray-900">{company.rejectionReason}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">求人数</p>
          <p className="mt-1 text-2xl font-bold">{company._count.jobs}</p>
        </div>
        <div className="border bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">応募数</p>
          <p className="mt-1 text-2xl font-bold">
            {company._count.applications}
          </p>
        </div>
      </div>

      {/* Users */}
      <div className="border bg-white p-6 shadow-sm">
        <h2 className="font-bold text-gray-900">担当者</h2>
        {company.companyUsers.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">
            まだ担当者がいません。下の「ログイン情報を発行」から招待してください。
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {company.companyUsers.map((u) => (
              <li key={u.id} className="py-2 text-sm">
                <p className="text-gray-900">{u.name ?? "(名前未設定)"}</p>
                <p className="text-gray-500">
                  {u.email} · {u.role} ·{" "}
                  {u.createdAt.toLocaleDateString("ja-JP")}
                  {u.mustChangePassword && (
                    <span className="ml-2 inline-block bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      仮 PW 未変更
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Invitation manager */}
      <InvitationManager
        companyId={company.id}
        pendingInvitations={pendingInvitations.map((inv) => ({
          ...inv,
          expiresAt: inv.expiresAt.toISOString(),
          createdAt: inv.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}

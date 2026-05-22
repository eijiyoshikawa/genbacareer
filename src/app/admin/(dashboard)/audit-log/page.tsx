import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { History } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "監査ログ",
  robots: { index: false, follow: false },
}

const PER_PAGE = 50

const ACTOR_LABEL: Record<string, string> = {
  admin: "管理者",
  company_user: "企業ユーザー",
  user: "求職者",
  system: "システム",
}

const ACTION_LABEL: Record<string, string> = {
  create: "作成",
  update: "更新",
  delete: "削除",
  approve: "承認",
  reject: "却下",
  login: "ログイン",
}

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") redirect("/login")

  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const resourceType = params.resourceType
  const actorType = params.actorType

  const where = {
    ...(resourceType ? { resourceType } : {}),
    ...(actorType ? { actorType } : {}),
  }

  const [items, total] = await Promise.all([
    prisma.auditLog
      .findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      })
      .catch(() => []),
    prisma.auditLog.count({ where }).catch(() => 0),
  ])

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))

  return (
    <div>
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <History className="h-6 w-6 text-primary-500" />
        監査ログ
      </h1>
      <p className="mt-1 text-sm text-gray-500">
        企業承認・テンプレ編集など重要操作の履歴。最新順に最大 {PER_PAGE} 件ずつ表示。
      </p>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <FilterChip
          label="すべて"
          href="/admin/audit-log"
          active={!resourceType && !actorType}
        />
        <FilterChip
          label="企業"
          href="/admin/audit-log?resourceType=company"
          active={resourceType === "company"}
        />
        <FilterChip
          label="テンプレ"
          href="/admin/audit-log?resourceType=job_template"
          active={resourceType === "job_template"}
        />
        <FilterChip
          label="求人"
          href="/admin/audit-log?resourceType=job"
          active={resourceType === "job"}
        />
        <FilterChip
          label="応募"
          href="/admin/audit-log?resourceType=application"
          active={resourceType === "application"}
        />
      </div>

      <div className="mt-4 overflow-hidden border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">日時</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">実行者</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">対象</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">操作</th>
              <th className="px-3 py-2 text-left text-xs font-bold text-gray-500">サマリ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.length === 0 ? (
              <tr>
                <td className="px-3 py-6 text-center text-sm text-gray-400" colSpan={5}>
                  ログがありません
                </td>
              </tr>
            ) : (
              items.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-xs text-gray-500 tabular-nums">
                    {log.createdAt.toLocaleString("ja-JP")}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <p className="font-bold text-gray-900">
                      {ACTOR_LABEL[log.actorType] ?? log.actorType}
                    </p>
                    {log.actorEmail && (
                      <p className="text-gray-500">{log.actorEmail}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">
                    <p className="font-mono text-gray-700">{log.resourceType}</p>
                    {log.resourceId && (
                      <p className="text-xs font-mono text-gray-400 break-all">
                        {log.resourceId}
                      </p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className="inline-flex px-2 py-0.5 text-xs font-bold bg-primary-100 text-primary-800">
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-gray-700">
                    {log.summary ?? <span className="text-gray-300">—</span>}
                    {log.diff != null && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">
                          詳細
                        </summary>
                        <pre className="mt-1 max-w-xl overflow-auto bg-gray-50 border p-2 text-xs font-mono whitespace-pre-wrap">
                          {JSON.stringify(log.diff, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-3 text-sm">
          {page > 1 && (
            <Link
              href={buildHref(page - 1, params)}
              className="border bg-white px-3 py-1.5 hover:bg-gray-50"
            >
              ← 前へ
            </Link>
          )}
          <span className="text-gray-500">
            {page} / {totalPages}（全 {total} 件）
          </span>
          {page < totalPages && (
            <Link
              href={buildHref(page + 1, params)}
              className="border bg-white px-3 py-1.5 hover:bg-gray-50"
            >
              次へ →
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}

function FilterChip({
  label,
  href,
  active,
}: {
  label: string
  href: string
  active: boolean
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center px-3 py-1 text-xs font-bold border ${
        active
          ? "bg-primary-600 text-white border-primary-600"
          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
      }`}
    >
      {label}
    </Link>
  )
}

function buildHref(page: number, params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams()
  sp.set("page", String(page))
  if (params.resourceType) sp.set("resourceType", params.resourceType)
  if (params.actorType) sp.set("actorType", params.actorType)
  return `/admin/audit-log?${sp.toString()}`
}

import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { ShieldCheck, UserPlus } from "lucide-react"
import { AdminAddForm } from "./add-form"
import { AdminRowActions } from "./row-actions"

export const metadata: Metadata = {
  title: "管理者一覧 | 管理画面",
}

export const dynamic = "force-dynamic"

export default async function AdminUsersPage() {
  const admins = await prisma.adminUser
    .findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        invitedBy: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
    .catch(() => [])

  const ownerEmail = process.env.ADMIN_EMAIL ?? null

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <ShieldCheck className="h-6 w-6 text-red-600" />
          管理者一覧
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          複数の管理者を登録できます。オーナー（環境変数で固定）は常時アクセス可能で、ここから追加した管理者は無効化・削除できます。
        </p>
      </header>

      {/* オーナー */}
      {ownerEmail && (
        <section className="border bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-900">オーナー（環境変数）</h2>
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-mono text-gray-700">{ownerEmail}</span>
            <span className="inline-flex bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              削除不可
            </span>
          </div>
        </section>
      )}

      {/* 追加フォーム */}
      <section className="border bg-white p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <UserPlus className="h-4 w-4 text-red-600" />
          新しい管理者を追加
        </h2>
        <p className="mt-1 text-xs text-gray-500">
          発行された PW は<strong>この画面で一度だけ表示</strong>されます。新管理者に安全な方法で共有してください（PW マネージャ・対面など）。
        </p>
        <div className="mt-4">
          <AdminAddForm />
        </div>
      </section>

      {/* 一覧 */}
      <section className="overflow-hidden border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">名前</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状態</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">招待元</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">最終ログイン</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">作成日</th>
              <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {admins.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500">
                  追加管理者はまだいません
                </td>
              </tr>
            ) : (
              admins.map((a) => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{a.email}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{a.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {a.isActive ? (
                      <span className="inline-flex bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                        有効
                      </span>
                    ) : (
                      <span className="inline-flex bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        無効
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{a.invitedBy ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.lastLoginAt
                      ? a.lastLoginAt.toLocaleString("ja-JP")
                      : "未ログイン"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {a.createdAt.toLocaleDateString("ja-JP")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <AdminRowActions id={a.id} isActive={a.isActive} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}

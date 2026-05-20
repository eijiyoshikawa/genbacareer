import { prisma } from "@/lib/db"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "ユーザー一覧",
}

type Props = {
  searchParams: Promise<{ page?: string; q?: string }>
}

export default async function AdminUsersPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const q = params.q ?? ""
  const perPage = 30

  const where = q
    ? {
        OR: [
          { email: { contains: q, mode: "insensitive" as const } },
          { name: { contains: q, mode: "insensitive" as const } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        email: true,
        name: true,
        prefecture: true,
        emailVerifiedAt: true,
        deletedAt: true,
        createdAt: true,
        _count: {
          select: {
            applications: true,
            scouts: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">ユーザー一覧</h1>
      <p className="mt-1 text-sm text-gray-500">{total} 名（退会済み含む）</p>

      <form className="mt-4 flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="メール・氏名で検索"
          className="rounded-md border px-3 py-1.5 text-sm flex-1 max-w-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          検索
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">ユーザー</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">居住地</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">応募</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">スカウト</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状態</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">登録</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id} className={u.deletedAt ? "bg-gray-50 text-gray-400" : ""}>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-gray-900">
                    {u.name ?? "—"}
                  </p>
                  <p className="text-xs text-gray-500">{u.email}</p>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {u.prefecture ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {u._count.applications}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {u._count.scouts}
                </td>
                <td className="px-4 py-3 text-sm">
                  {u.deletedAt ? (
                    <span className="inline-flex rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600">
                      退会済み
                    </span>
                  ) : u.emailVerifiedAt ? (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                      認証済み
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
                      未認証
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                  {u.createdAt.toLocaleDateString("ja-JP")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/users?q=${encodeURIComponent(q)}&page=${p}`}
              className={`rounded-md px-3 py-1 text-sm ${
                p === page
                  ? "bg-blue-600 text-white"
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

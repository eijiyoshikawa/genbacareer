import { prisma } from "@/lib/db"
import { Users, ShieldAlert, ShieldCheck } from "lucide-react"
import type { Metadata } from "next"
import { UserStatusToggle } from "./status-toggle"

export const metadata: Metadata = {
  title: "ユーザー管理",
}

export const dynamic = "force-dynamic"

type SearchParams = Promise<{
  status?: string
  q?: string
  page?: string
}>

const PER_PAGE = 30

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const sp = await searchParams
  const status = sp.status ?? "all"
  const q = sp.q?.trim() ?? ""
  const page = Math.max(1, Number(sp.page ?? "1"))

  const where = {
    ...(status === "active"
      ? { status: "active" }
      : status === "suspended"
        ? { status: "suspended" }
        : status === "deleted"
          ? { status: "deleted" }
          : {}),
    ...(q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" as const } },
            { name: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PER_PAGE,
      take: PER_PAGE,
      select: {
        id: true,
        email: true,
        name: true,
        prefecture: true,
        status: true,
        suspendedAt: true,
        suspendedReason: true,
        emailVerified: true,
        createdAt: true,
      },
    }),
    prisma.user.count({ where }),
  ])

  const totalPages = Math.ceil(total / PER_PAGE)

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
        <Users className="h-6 w-6 text-primary-600" />
        ユーザー管理
      </h1>

      <form className="mt-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-bold text-gray-700">
            ステータス
          </label>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 border px-3 py-2 text-sm"
          >
            <option value="all">すべて</option>
            <option value="active">通常</option>
            <option value="suspended">凍結中</option>
            <option value="deleted">退会済</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-bold text-gray-700">
            メール / 氏名検索
          </label>
          <input
            name="q"
            defaultValue={q}
            className="mt-1 w-full border px-3 py-2 text-sm"
            placeholder="example@... / 山田"
          />
        </div>
        <button
          type="submit"
          className="press bg-primary-600 px-4 py-2 text-sm font-bold text-white"
        >
          絞り込む
        </button>
      </form>

      <p className="mt-4 text-xs text-gray-500">
        全 <span className="font-bold text-primary-700">{total}</span> 件 / page{" "}
        {page} of {totalPages || 1}
      </p>

      <div className="mt-3 overflow-x-auto border bg-white">
        <table className="min-w-full divide-y text-sm">
          <thead className="bg-gray-50 text-xs font-bold text-gray-700">
            <tr>
              <th className="px-3 py-2 text-left">メール / 氏名</th>
              <th className="px-3 py-2 text-left">都道府県</th>
              <th className="px-3 py-2 text-left">登録日</th>
              <th className="px-3 py-2 text-left">状態</th>
              <th className="px-3 py-2 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="px-3 py-2">
                  <p className="font-mono text-xs text-gray-700">{u.email}</p>
                  <p className="text-xs text-gray-500">{u.name ?? "—"}</p>
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  {u.prefecture ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-gray-500">
                  {u.createdAt.toLocaleDateString("ja-JP")}
                </td>
                <td className="px-3 py-2">
                  {u.status === "active" && (
                    <span className="inline-flex items-center gap-1 bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                      <ShieldCheck className="h-3 w-3" />
                      通常
                    </span>
                  )}
                  {u.status === "suspended" && (
                    <span className="inline-flex items-center gap-1 bg-red-50 px-2 py-0.5 text-xs font-bold text-red-700">
                      <ShieldAlert className="h-3 w-3" />
                      凍結中
                    </span>
                  )}
                  {u.status === "deleted" && (
                    <span className="bg-gray-100 px-2 py-0.5 text-xs font-bold text-gray-500">
                      退会済
                    </span>
                  )}
                  {u.suspendedReason && (
                    <p className="mt-1 text-xs text-gray-500">
                      理由: {u.suspendedReason}
                    </p>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {u.status !== "deleted" && (
                    <UserStatusToggle
                      userId={u.id}
                      currentStatus={u.status as "active" | "suspended"}
                    />
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-3 py-8 text-center text-sm text-gray-500"
                >
                  該当ユーザーがいません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

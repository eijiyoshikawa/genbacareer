import { prisma } from "@/lib/db"
import Link from "next/link"
import type { Metadata } from "next"
import { JobModerationActions } from "./actions"

export const metadata: Metadata = {
  title: "求人モデレーション",
}

type Props = {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>
}

export default async function AdminJobsPage({ searchParams }: Props) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const status = params.status ?? "all"
  const q = params.q ?? ""
  const perPage = 30

  const where = {
    ...(status !== "all" ? { status } : {}),
    ...(q
      ? { title: { contains: q, mode: "insensitive" as const } }
      : {}),
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        status: true,
        source: true,
        moderationNote: true,
        createdAt: true,
        company: { select: { name: true } },
      },
    }),
    prisma.job.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">求人モデレーション</h1>
      <p className="mt-1 text-sm text-gray-500">{total} 件の求人</p>

      <form className="mt-4 flex flex-wrap gap-2 items-center">
        <input
          name="q"
          defaultValue={q}
          placeholder="求人タイトルで検索"
          className="rounded-md border px-3 py-1.5 text-sm flex-1 max-w-sm"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded-md border px-2 py-1.5 text-sm"
        >
          <option value="all">すべて</option>
          <option value="draft">下書き</option>
          <option value="active">掲載中</option>
          <option value="suspended">停止中</option>
          <option value="closed">クローズ</option>
        </select>
        <button
          type="submit"
          className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          絞り込み
        </button>
      </form>

      <div className="mt-4 overflow-hidden rounded-lg border bg-white shadow-sm">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">求人</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">企業</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">状態</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">作成日</th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {jobs.map((job) => (
              <tr key={job.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                  >
                    {job.title}
                  </Link>
                  {job.source === "hellowork" && (
                    <span className="ml-2 inline-block rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                      hellowork
                    </span>
                  )}
                  {job.moderationNote && (
                    <p className="mt-1 text-xs text-yellow-700">
                      {job.moderationNote}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {job.company?.name ?? "—"}
                </td>
                <td className="px-4 py-3 text-sm">
                  <StatusBadge status={job.status} />
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-gray-500">
                  {job.createdAt.toLocaleDateString("ja-JP")}
                </td>
                <td className="px-4 py-3">
                  <JobModerationActions jobId={job.id} status={job.status} />
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
              href={`/admin/jobs?status=${status}&q=${encodeURIComponent(q)}&page=${p}`}
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    draft: "bg-gray-100 text-gray-700",
    closed: "bg-gray-200 text-gray-700",
    suspended: "bg-red-100 text-red-700",
  }
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-gray-100 text-gray-700"
      }`}
    >
      {status}
    </span>
  )
}

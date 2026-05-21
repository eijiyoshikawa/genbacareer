import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import Link from "next/link"
import { HiringFeeEditor } from "./hiring-fee-editor"
import { HIRING_FEE_AMOUNT } from "@/lib/stripe"
import { HIRING_FEE_MIN, HIRING_FEE_MAX } from "@/lib/hiring-fee"

/**
 * 求人ごとの成果報酬単価管理ダッシュボード (admin 専用)。
 *
 * - direct 求人 (自社認定企業の掲載) のみ対象 (hellowork は対象外)
 * - NULL = HIRING_FEE_AMOUNT (498,000) フォールバック
 * - 範囲: 200,000 〜 2,000,000
 */

export const metadata = {
  title: "求人別 成果報酬単価",
}

export const dynamic = "force-dynamic"

export default async function HiringFeesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ company?: string; page?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect("/admin/login")
  const role = (session.user as { role?: string }).role
  if (role !== "admin") redirect("/admin/login")

  const params = await searchParams
  const companyFilter = params.company?.trim() || ""
  const page = Math.max(1, Number(params.page) || 1)
  const perPage = 50

  const where = {
    source: "direct",
    status: { in: ["active", "draft"] },
    ...(companyFilter
      ? {
          company: {
            name: { contains: companyFilter, mode: "insensitive" as const },
          },
        }
      : {}),
  }

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip: (page - 1) * perPage,
      take: perPage,
      select: {
        id: true,
        title: true,
        status: true,
        prefecture: true,
        category: true,
        hiringFeeAmount: true,
        publishedAt: true,
        company: { select: { id: true, name: true } },
      },
    }),
    prisma.job.count({ where }),
  ])

  const totalPages = Math.ceil(total / perPage)
  const customCount = jobs.filter((j) => j.hiringFeeAmount != null).length
  const defaultCount = jobs.length - customCount

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">求人別 成果報酬単価</h1>
        <p className="mt-1 text-sm text-gray-500">
          求人ごとに成果報酬単価を設定できます。未設定の場合は既定値
          <strong> ¥{HIRING_FEE_AMOUNT.toLocaleString()}</strong> が適用されます。
          設定可能レンジ: ¥{HIRING_FEE_MIN.toLocaleString()} 〜 ¥{HIRING_FEE_MAX.toLocaleString()}。
        </p>
      </header>

      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="border bg-white p-4">
          <p className="text-xs text-gray-500">既定値運用</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {defaultCount} <span className="text-xs font-normal text-gray-400">件</span>
          </p>
        </div>
        <div className="border bg-white p-4">
          <p className="text-xs text-gray-500">個別設定済み</p>
          <p className="mt-1 text-2xl font-bold text-primary-600">
            {customCount} <span className="text-xs font-normal text-gray-400">件</span>
          </p>
        </div>
        <div className="border bg-white p-4">
          <p className="text-xs text-gray-500">合計 (direct のみ)</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {total.toLocaleString()} <span className="text-xs font-normal text-gray-400">件</span>
          </p>
        </div>
      </div>

      {/* 会社名フィルタ */}
      <form className="flex items-center gap-2">
        <input
          type="search"
          name="company"
          defaultValue={companyFilter}
          placeholder="会社名で絞り込み..."
          className="flex-1 border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          type="submit"
          className="press border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          絞り込み
        </button>
        {companyFilter && (
          <Link
            href="/admin/hiring-fees"
            className="text-xs text-gray-500 hover:text-primary-600"
          >
            クリア
          </Link>
        )}
      </form>

      {/* 求人一覧 */}
      {jobs.length === 0 ? (
        <div className="border bg-white p-8 text-center">
          <p className="text-sm text-gray-500">対象の求人がありません。</p>
        </div>
      ) : (
        <div className="border bg-white overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">求人</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">企業</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">カテゴリ</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase text-gray-500">単価</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm">
                    <Link
                      href={`/jobs/${job.id}`}
                      target="_blank"
                      className="text-gray-900 hover:text-primary-600 line-clamp-1"
                    >
                      {job.title}
                    </Link>
                    <p className="text-[11px] text-gray-400">
                      {job.status === "draft" ? "下書き" : "公開中"} · {job.prefecture}
                    </p>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">
                    {job.company?.name ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-600">{job.category}</td>
                  <td className="px-3 py-2">
                    <HiringFeeEditor
                      jobId={job.id}
                      initialValue={job.hiringFeeAmount}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ページング */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/hiring-fees?${new URLSearchParams({
                ...(companyFilter ? { company: companyFilter } : {}),
                page: String(p),
              }).toString()}`}
              className={`px-3 py-1 text-sm ${
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

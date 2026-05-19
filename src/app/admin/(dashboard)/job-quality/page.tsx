import { prisma } from "@/lib/db"
import Link from "next/link"
import { CloseJobButton } from "./close-button"

/**
 * 求人精査ダッシュボード。
 * - 全 active 求人を rankScore バケット別に集計
 * - 低スコア (≤ 5) の求人 100 件を一覧表示
 * - admin が「不適切でクローズ」ボタンを押すと status=closed に変更
 */

const BUCKETS = [
  { label: "< 0 (要削除)", color: "bg-red-100 text-red-800", min: -1000, max: 0 },
  { label: "0", color: "bg-orange-100 text-orange-800", min: 0, max: 1 },
  { label: "1-5 (低)", color: "bg-amber-100 text-amber-800", min: 1, max: 6 },
  { label: "6-15", color: "bg-yellow-100 text-yellow-800", min: 6, max: 16 },
  { label: "16-30 (中)", color: "bg-gray-100 text-gray-700", min: 16, max: 31 },
  { label: "31-60 (高)", color: "bg-emerald-100 text-emerald-800", min: 31, max: 61 },
  { label: "61+ (最高)", color: "bg-blue-100 text-blue-800", min: 61, max: 10000 },
]

export default async function JobQualityPage() {
  // バケット別カウント
  const bucketCounts = await Promise.all(
    BUCKETS.map(async (b) => {
      const count = await prisma.job.count({
        where: {
          status: "active",
          rankScore: { gte: b.min, lt: b.max },
        },
      })
      return { ...b, count }
    })
  )

  // 低スコア求人を 100 件
  const lowQualityJobs = await prisma.job.findMany({
    where: { status: "active", rankScore: { lte: 5 } },
    orderBy: [{ rankScore: "asc" }, { viewCount: "asc" }],
    take: 100,
    select: {
      id: true,
      title: true,
      source: true,
      category: true,
      prefecture: true,
      salaryMin: true,
      rankScore: true,
      viewCount: true,
      publishedAt: true,
      company: { select: { name: true } },
    },
  })

  const totalActive = bucketCounts.reduce((sum, b) => sum + b.count, 0)

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-bold text-gray-900">求人精査ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          rankScore のバケット別件数と低スコア求人の一覧。ワンクリックでクローズできます。
        </p>
      </header>

      {/* バケット集計 */}
      <section className="border bg-white p-4">
        <h2 className="text-sm font-bold text-gray-900">スコア分布 (active: {totalActive.toLocaleString()} 件)</h2>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
          {bucketCounts.map((b) => (
            <div
              key={b.label}
              className={`border px-3 py-2 ${b.color}`}
            >
              <p className="text-xs font-medium">{b.label}</p>
              <p className="mt-1 text-lg font-bold">{b.count.toLocaleString()}</p>
              <p className="text-[10px] opacity-70">
                {totalActive > 0 ? ((b.count / totalActive) * 100).toFixed(1) : "0"}%
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 低品質求人リスト */}
      <section className="border bg-white">
        <div className="p-4 border-b">
          <h2 className="text-sm font-bold text-gray-900">
            低スコア求人 (rankScore ≤ 5、上位 {lowQualityJobs.length} 件)
          </h2>
          <p className="mt-1 text-xs text-gray-500">
            スコアの低い順に表示。確認して「クローズ」を押すと検索結果から除外されます。
          </p>
        </div>
        {lowQualityJobs.length === 0 ? (
          <p className="p-6 text-sm text-gray-500 text-center">
            低スコア求人はありません 🎉
          </p>
        ) : (
          <div className="divide-y">
            {lowQualityJobs.map((job) => (
              <div key={job.id} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                      {job.source === "direct" ? "認定企業" : "公共求人"}
                    </span>
                    <span className="bg-gray-100 px-1.5 py-0.5 font-medium text-gray-600">
                      {job.category}
                    </span>
                    <span className="font-bold text-red-600">スコア {job.rankScore}</span>
                  </div>
                  <Link
                    href={`/jobs/${job.id}`}
                    target="_blank"
                    className="block mt-1 text-sm font-semibold text-gray-900 hover:text-primary-600 line-clamp-1"
                  >
                    {job.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {job.company?.name ?? "（企業情報なし）"} · {job.prefecture} ·
                    {job.salaryMin ? ` 給与あり` : " 給与なし"} ·
                    閲覧 {job.viewCount}
                  </p>
                </div>
                <CloseJobButton jobId={job.id} />
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

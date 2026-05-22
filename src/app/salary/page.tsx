import Link from "next/link"
import { prisma } from "@/lib/db"
import {
  CONSTRUCTION_CATEGORY_VALUES,
  getCategoryLabel,
} from "@/lib/categories"
import { Banknote, TrendingUp, MapPin, Briefcase } from "lucide-react"
import type { Metadata } from "next"

// ビルド時の DB 接続枯渇を回避するため、初回リクエスト時にレンダリング。
// ISR (revalidate=3600) で 2 回目以降はキャッシュ応答。
export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: "建設業の給与ランキング | ゲンバキャリア",
  description:
    "都道府県別・職種別の建設業の平均給与をランキングで掲載。型枠大工、施工管理、電気工事、土木など、職種別の年収相場が一目で分かります。",
  alternates: { canonical: "/salary" },
  openGraph: {
    title: "建設業の給与ランキング | ゲンバキャリア",
    description:
      "都道府県別 × 職種別の建設業 平均年収ランキング。施工管理 / 電気工事 / 型枠大工 / 土木 / 解体 など職種別相場。",
  },
}

type Aggregation = {
  key: string
  count: number
  avg: number
  max: number
  min: number
}

async function aggregateBy(
  field: "prefecture" | "category"
): Promise<Aggregation[]> {
  // SQL で AVG / MAX / MIN を集計。salary_min を主軸に、salaryMax > 0 のもののみ。
  try {
    const rows = await prisma.$queryRawUnsafe<
      Array<{
        key: string
        count: bigint
        avg: number | null
        max: number | null
        min: number | null
      }>
    >(
      `
      SELECT
        ${field} AS key,
        COUNT(*)::bigint AS count,
        AVG(salary_min)::float AS avg,
        MAX(salary_max)::int AS max,
        MIN(salary_min)::int AS min
      FROM jobs
      WHERE status = 'active'
        AND category = ANY($1)
        AND salary_min IS NOT NULL
        AND salary_min > 0
      GROUP BY ${field}
      HAVING COUNT(*) >= 3
      ORDER BY AVG(salary_min) DESC
      LIMIT 20;
      `,
      [...CONSTRUCTION_CATEGORY_VALUES]
    )
    return rows.map((r) => ({
      key: r.key,
      count: Number(r.count),
      avg: Math.round(r.avg ?? 0),
      max: r.max ?? 0,
      min: r.min ?? 0,
    }))
  } catch {
    return []
  }
}

function formatYen(n: number): string {
  if (n >= 10_000) return `${(n / 10_000).toFixed(0)} 万円`
  return `${n.toLocaleString("ja-JP")} 円`
}

export default async function SalaryRankingPage() {
  const [byPrefecture, byCategory] = await Promise.all([
    aggregateBy("prefecture"),
    aggregateBy("category"),
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Banknote className="h-8 w-8 text-amber-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            建設業の給与ランキング
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            掲載中の求人データから集計。平均は salary_min ベース、3 件以上の求人がある条件のみ掲載。
          </p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <Briefcase className="h-5 w-5 text-primary-600" />
          職種別 平均給与ランキング
        </h2>
        {byCategory.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">データがまだ集まっていません。</p>
        ) : (
          <ol className="mt-4 divide-y border bg-white">
            {byCategory.map((row, i) => (
              <li key={row.key}>
                <Link
                  href={`/jobs?category=${encodeURIComponent(row.key)}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center text-sm font-extrabold text-white ${
                      i === 0
                        ? "bg-amber-500"
                        : i === 1
                          ? "bg-gray-400"
                          : i === 2
                            ? "bg-amber-700"
                            : "bg-gray-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">
                      {getCategoryLabel(row.key)}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      募集中 {row.count} 件 / 最低 {formatYen(row.min)} 〜 最高{" "}
                      {formatYen(row.max)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">平均</p>
                    <p className="text-sm font-bold text-primary-700">
                      {formatYen(row.avg)}
                    </p>
                  </div>
                  <TrendingUp className="h-4 w-4 text-gray-300" />
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
          <MapPin className="h-5 w-5 text-emerald-600" />
          都道府県別 平均給与ランキング
        </h2>
        {byPrefecture.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">データがまだ集まっていません。</p>
        ) : (
          <ol className="mt-4 divide-y border bg-white">
            {byPrefecture.map((row, i) => (
              <li key={row.key}>
                <Link
                  href={`/jobs?prefecture=${encodeURIComponent(row.key)}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50"
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center text-sm font-extrabold text-white ${
                      i === 0
                        ? "bg-amber-500"
                        : i === 1
                          ? "bg-gray-400"
                          : i === 2
                            ? "bg-amber-700"
                            : "bg-gray-300"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-gray-900">{row.key}</p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      募集中 {row.count} 件 / 最低 {formatYen(row.min)} 〜 最高{" "}
                      {formatYen(row.max)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">平均</p>
                    <p className="text-sm font-bold text-emerald-700">
                      {formatYen(row.avg)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <p className="mt-8 border-t pt-4 text-xs text-gray-400">
        ※ 上記は当サイト掲載中の求人データから機械的に集計した参考値です。実際の支給額は企業・経験・資格により異なります。
      </p>
    </div>
  )
}

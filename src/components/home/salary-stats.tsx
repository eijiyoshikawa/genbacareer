import Link from "next/link"

export type SalaryStatRow = {
  category: string
  label: string
  /** 平均月給（円） */
  avgMin: number
  avgMax: number
  count: number
}

const toMan = (yen: number) => Math.round(yen / 10000)

/**
 * 職種別の平均月給を横棒で見せる「給与相場」セクション。
 * 掲載中の月給制求人から算出した平均値（props で受け取る）。
 */
export function SalaryStats({ rows }: { rows: SalaryStatRow[] }) {
  if (rows.length === 0) return null
  const max = Math.max(...rows.map((r) => r.avgMax || r.avgMin), 1)

  return (
    <section className="card-elevated bg-white p-5 sm:p-6">
      <div className="mb-1 flex items-end justify-between gap-3">
        <h2 className="section-bar text-xl font-bold text-gray-900 sm:text-2xl">
          建設業の給与相場（職種別・月給）
        </h2>
      </div>
      <p className="mb-4 text-xs text-gray-500">
        掲載中の月給制求人から算出した平均月給です。
      </p>
      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.category}>
            <div className="flex items-baseline justify-between gap-2">
              <Link
                href={`/jobs?category=${r.category}`}
                className="text-sm font-bold text-gray-800 hover:text-primary-700"
              >
                {r.label}
              </Link>
              <span className="shrink-0 text-sm font-extrabold text-primary-700">
                {toMan(r.avgMin)}〜{toMan(r.avgMax || r.avgMin)}万円
              </span>
            </div>
            <div className="mt-1 h-2.5 w-full overflow-hidden bg-gray-100">
              <div
                className="bg-brand-gradient h-full"
                style={{ width: `${Math.max(6, ((r.avgMax || r.avgMin) / max) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-[11px] text-gray-400">
        ※ 平均値は掲載求人の提示額に基づく参考値です。
      </p>
    </section>
  )
}

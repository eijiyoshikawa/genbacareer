import Link from "next/link"
import { PREFECTURES } from "@/lib/constants"
import { CATEGORIES } from "@/lib/categories"

/**
 * 巨大 SEO フッター（リクナビ参考）。
 * 勤務地 / 職種 / こだわり条件 / 給与 の網羅リンクで内部リンクと SEO を強化する。
 * ページ下部・グローバルフッターの直前に置く想定。
 */

const CONDITIONS: string[] = [
  "未経験歓迎",
  "学歴不問",
  "資格取得支援",
  "寮・社宅あり",
  "週休2日",
  "日払い・週払い",
  "高収入",
  "社会保険完備",
  "土日祝休み",
  "50代も活躍",
  "正社員",
  "賞与あり",
  "車・バイク通勤OK",
  "転勤なし",
]

const SALARIES: Array<{ label: string; min: number }> = [
  { label: "月給20万円以上", min: 20 },
  { label: "月給25万円以上", min: 25 },
  { label: "月給30万円以上", min: 30 },
  { label: "月給35万円以上", min: 35 },
  { label: "月給40万円以上", min: 40 },
  { label: "月給50万円以上", min: 50 },
]

export function SeoFooterLinks() {
  return (
    <section className="border-t border-gray-200 bg-warm-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-8">
        {/* 勤務地から探す */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-gray-900 section-bar">
            勤務地から探す
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {PREFECTURES.map((p) => (
              <Link
                key={p}
                href={`/jobs?prefecture=${encodeURIComponent(p)}`}
                className="text-xs text-gray-600 hover:text-primary-700 hover:underline"
              >
                {p}の求人
              </Link>
            ))}
          </div>
        </div>

        {/* 職種から探す */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-gray-900 section-bar">
            職種から探す
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
              <Link
                key={c.value}
                href={`/jobs?category=${c.value}`}
                className="text-xs text-gray-600 hover:text-primary-700 hover:underline"
              >
                {c.label}の求人
              </Link>
            ))}
          </div>
        </div>

        {/* こだわり条件から探す */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-gray-900 section-bar">
            こだわり条件から探す
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {CONDITIONS.map((q) => (
              <Link
                key={q}
                href={`/jobs?q=${encodeURIComponent(q)}`}
                className="text-xs text-gray-600 hover:text-primary-700 hover:underline"
              >
                {q}
              </Link>
            ))}
          </div>
        </div>

        {/* 給与から探す */}
        <div>
          <h2 className="mb-3 text-sm font-bold text-gray-900 section-bar">
            給与から探す
          </h2>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {SALARIES.map((s) => (
              <Link
                key={s.min}
                href={`/jobs?salary_min=${s.min}`}
                className="text-xs text-gray-600 hover:text-primary-700 hover:underline"
              >
                {s.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

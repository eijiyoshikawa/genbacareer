import { Search, MapPin, Briefcase, Share2 } from "lucide-react"
import { PREFECTURES } from "@/lib/constants"
import { CATEGORIES } from "@/lib/categories"

/**
 * トップページ Hero 直下に置く 3 軸クイック検索パネル。
 *
 * - 勤務地 / 職種 / SNS・動画の有無 の 3 ドロップダウン + 検索ボタン
 * - <form action="/jobs"> でサーバーサイドの jobs ページに GET 送信
 * - サーバー Component (state なし) で hydration コストゼロ
 */

export function QuickSearchPanel({ totalJobs }: { totalJobs?: number }) {
  return (
    <section className="bg-warm-50 border-y border-warm-200">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {totalJobs != null && totalJobs > 0 && (
          <p className="mb-3 text-sm text-gray-700">
            掲載求人数{" "}
            <span className="text-xl font-extrabold text-primary-600 mx-1">
              {totalJobs.toLocaleString()}
            </span>
            件
          </p>
        )}
        <form action="/jobs" role="search" className="bg-white shadow-md border-l-4 border-brand-yellow-500 p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {/* 勤務地 */}
            <label className="flex items-center gap-2 border border-gray-200 px-3 py-2 hover:border-primary-300">
              <MapPin className="h-4 w-4 text-primary-500 shrink-0" aria-hidden />
              <span className="sr-only">勤務地</span>
              <select
                name="prefecture"
                defaultValue=""
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 focus:outline-none"
              >
                <option value="">勤務地を選ぶ</option>
                {PREFECTURES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            {/* 職種 */}
            <label className="flex items-center gap-2 border border-gray-200 px-3 py-2 hover:border-primary-300">
              <Briefcase className="h-4 w-4 text-primary-500 shrink-0" aria-hidden />
              <span className="sr-only">職種</span>
              <select
                name="category"
                defaultValue=""
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 focus:outline-none"
              >
                <option value="">職種を選ぶ</option>
                {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            {/* SNS・動画の有無 */}
            <label className="flex items-center gap-2 border border-gray-200 px-3 py-2 hover:border-primary-300">
              <Share2 className="h-4 w-4 text-primary-500 shrink-0" aria-hidden />
              <span className="sr-only">SNS・動画の有無</span>
              <select
                name="sns"
                defaultValue=""
                className="flex-1 min-w-0 bg-transparent text-sm text-gray-900 focus:outline-none"
              >
                <option value="">SNS・動画の有無</option>
                <option value="with">SNS・動画あり</option>
                <option value="without">SNS・動画なし</option>
              </select>
            </label>

            {/* 検索ボタン */}
            <button
              type="submit"
              className="press btn-brand-gradient inline-flex h-11 items-center justify-center gap-1.5 px-5 text-sm font-extrabold shadow"
            >
              <Search className="h-4 w-4" aria-hidden />
              この条件で検索
            </button>
          </div>

          {/* キーワードチップ */}
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[11px] text-gray-500">人気キーワード:</span>
            {[
              { label: "未経験OK", q: "未経験" },
              { label: "資格取得支援", q: "資格" },
              { label: "寮あり", q: "寮" },
              { label: "週休2日", q: "週休2日" },
              { label: "日払い", q: "日払い" },
              { label: "高収入", q: "高収入" },
            ].map((c) => (
              <a
                key={c.q}
                href={`/jobs?q=${encodeURIComponent(c.q)}`}
                className="press inline-flex items-center bg-warm-100 hover:bg-primary-50 px-2.5 py-1 text-xs font-bold text-gray-700 hover:text-primary-700 border border-warm-200 hover:border-primary-300"
              >
                #{c.label}
              </a>
            ))}
          </div>
        </form>
      </div>
    </section>
  )
}

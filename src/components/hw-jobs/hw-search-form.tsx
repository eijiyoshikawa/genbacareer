import { Search, SlidersHorizontal } from "lucide-react"
import { PREFECTURES } from "@/lib/constants"

const HW_JOB_TYPES = ["フルタイム", "パート", "季節", "出稼ぎ"] as const

interface HwSearchFormProps {
  values: {
    prefecture?: string
    jobType?: string
    employmentType?: string
    minSalary?: string
    q?: string
  }
}

export function HwSearchForm({ values }: HwSearchFormProps) {
  return (
    <form
      method="get"
      action="/hw-jobs"
      className=" bg-brand-yellow-500 p-4 shadow-sm sm:p-5"
    >
      <div className="flex items-center gap-2 text-sm font-bold text-ink-900">
        <SlidersHorizontal className="h-4 w-4" />
        条件で絞り込む
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="block text-xs font-bold text-ink-900">都道府県</span>
          <select
            name="prefecture"
            defaultValue={values.prefecture ?? ""}
            className="mt-1 w-full  border border-warm-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">指定なし</option>
            {PREFECTURES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-ink-900">求人区分</span>
          <select
            name="jobType"
            defaultValue={values.jobType ?? ""}
            className="mt-1 w-full  border border-warm-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="">指定なし</option>
            {HW_JOB_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="block text-xs font-bold text-ink-900">最低月給（円）</span>
          <input
            type="number"
            name="minSalary"
            min={0}
            step={10000}
            defaultValue={values.minSalary ?? ""}
            placeholder="例: 200000"
            className="mt-1 w-full  border border-warm-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </label>

        <label className="block sm:col-span-2 lg:col-span-3">
          <span className="block text-xs font-bold text-ink-900">キーワード</span>
          <input
            type="search"
            name="q"
            maxLength={100}
            defaultValue={values.q ?? ""}
            placeholder="職種・仕事内容・事業所名"
            className="mt-1 w-full  border border-warm-200 bg-white px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </label>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-1.5 bg-primary-500 px-6 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-600 transition"
        >
          <Search className="h-4 w-4" />
          検索する
        </button>
      </div>
    </form>
  )
}

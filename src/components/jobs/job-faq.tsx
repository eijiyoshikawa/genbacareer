import { CaretDown } from "@phosphor-icons/react/dist/ssr"
import { getCategoryLabel } from "@/lib/categories"

/**
 * 「この求人に関するよくある質問」FAQ アコーディオン（建職バンク参考）。
 * 求人データから Q&A を生成。JS 不要の <details> ベース。
 * 構造化データ(FAQPage)も併せて出すと SEO に有効だが、ここでは表示のみ。
 */

type JobFaqData = {
  category: string
  prefecture: string
  city: string | null
  address: string | null
  employmentType: string | null
  salaryMin: number | null
  salaryMax: number | null
  salaryType: string | null
  requiredExperience: string | null
}

const isBlank = (v: string | null | undefined) => !v || v.trim() === ""

function salaryText(min: number | null, max: number | null, type: string | null): string {
  if (!min && !max) return "詳細は求人本文をご確認ください。"
  const unit =
    type === "hourly" ? "時給" : type === "annual" ? "年収" : type === "daily" ? "日給" : "月給"
  const useMan = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useMan && n >= 10000 ? `${(n / 10000).toFixed(0)}万円` : `${n.toLocaleString()}円`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)} です。`
  if (min) return `${unit} ${fmt(min)}〜 です。`
  return `${unit} 〜${fmt(max!)} です。`
}

function employmentText(type: string | null): string {
  if (isBlank(type)) return "求人本文をご確認ください。"
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート・アルバイト",
    contract: "契約社員",
  }
  return `${labels[type!] ?? type} です。`
}

export function JobFaq({ job }: { job: JobFaqData }) {
  const place =
    [job.prefecture, job.city].filter((v) => !isBlank(v)).join(" ") || "求人本文をご確認ください"

  const qa: Array<{ q: string; a: string }> = [
    {
      q: "この求人の給与はいくらですか？",
      a: salaryText(job.salaryMin, job.salaryMax, job.salaryType),
    },
    { q: "この求人の勤務地はどこですか？", a: `${place} です。${isBlank(job.address) ? "" : `（${job.address}）`}` },
    {
      q: "この求人に必要な資格・経験はありますか？",
      a: isBlank(job.requiredExperience)
        ? "未経験・無資格から応募いただけます（詳細は応募条件をご確認ください）。"
        : job.requiredExperience!.trim(),
    },
    { q: "この求人の雇用形態は何ですか？", a: employmentText(job.employmentType) },
    {
      q: "この求人はどのような職種ですか？",
      a: `${getCategoryLabel(job.category)} の求人です。`,
    },
  ]

  return (
    <section className="border-t pt-6">
      <h2 className="section-bar mb-4 text-xl font-bold text-gray-900 sm:text-2xl">
        この求人に関するよくある質問
      </h2>
      <div className="divide-y divide-gray-200 border-y border-gray-200">
        {qa.map((item, i) => (
          <details key={i} className="group">
            <summary className="flex cursor-pointer items-center justify-between gap-3 py-3.5 text-sm font-bold text-gray-900 marker:content-['']">
              <span>
                <span className="mr-1.5 font-black text-primary-600">Q.</span>
                {item.q}
              </span>
              <CaretDown
                weight="bold"
                className="h-4 w-4 shrink-0 text-gray-400 transition group-open:rotate-180"
              />
            </summary>
            <p className="whitespace-pre-wrap pb-4 text-sm leading-relaxed text-gray-700">
              {item.a}
            </p>
          </details>
        ))}
      </div>
    </section>
  )
}

import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import {
  Banknote,
  Building2,
  Calendar,
  ChevronLeft,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react"
import { getHwJob } from "@/lib/jobs-api"
import { safeFetch } from "@/lib/jobs-api/safe-fetch"
import { formatJpDate, formatSalaryRange } from "@/lib/jobs-api/format"
import { HwApiUnavailable } from "@/components/hw-jobs/hw-api-unavailable"
import { HwJobStructuredData } from "@/components/hw-jobs/hw-job-structured-data"

export const revalidate = 600

interface PageProps {
  params: Promise<{ kjno: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kjno } = await params
  const result = await safeFetch(() => getHwJob(kjno))
  if (!result.ok || !result.data?.job) {
    return { title: "求人詳細" }
  }
  const job = result.data.job
  const company = job.company.name ?? ""
  const baseTitle = job.title ?? job.occupation ?? "求人"
  return {
    title: `${baseTitle}${company ? ` - ${company}` : ""}`,
    description: job.description?.slice(0, 160) ?? undefined,
    alternates: { canonical: `/hw-jobs/${kjno}` },
  }
}

export default async function HwJobDetailPage({ params }: PageProps) {
  const { kjno } = await params
  const result = await safeFetch(() => getHwJob(kjno))

  if (!result.ok && result.reason === "not-found") notFound()

  if (!result.ok) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <BackLink />
        <div className="mt-4">
          <HwApiUnavailable reason={result.reason as "not-configured" | "upstream-error"} message={result.message} />
        </div>
      </div>
    )
  }

  const job = result.data.job
  const salary = formatSalaryRange(job.salary)

  return (
    <article className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <HwJobStructuredData job={job} />

      <BackLink />

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="bg-gray-50 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
            公共求人
          </span>
          {job.jobType && (
            <span className=" bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
              {job.jobType}
            </span>
          )}
          {job.employmentType && (
            <span className=" bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
              {job.employmentType}
            </span>
          )}
        </div>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {job.title ?? job.occupation ?? "求人"}
        </h1>
        {job.company.name && (
          <Link
            href={
              job.company.hojinno
                ? `/hw-employers/${encodeURIComponent(job.company.hojinno)}`
                : "#"
            }
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary-600 hover:underline"
          >
            <Building2 className="h-4 w-4" />
            {job.company.name}
          </Link>
        )}
      </header>

      <Section title="基本情報">
        <DefList
          items={[
            { label: "求人番号", value: job.kjno },
            { label: "職種", value: job.occupation },
            { label: "雇用形態", value: job.employmentType },
            { label: "雇用期間", value: job.employmentPeriod },
            { label: "在宅勤務", value: job.remoteWork },
          ]}
        />
      </Section>

      <Section title="勤務地" icon={<MapPin className="h-4 w-4" />}>
        <DefList
          items={[
            { label: "都道府県", value: job.location.prefecture },
            { label: "就業場所", value: job.location.address },
            { label: "事業所所在地", value: job.location.employerAddress },
            { label: "郵便番号", value: job.location.employerPostalCode },
            { label: "最寄駅", value: job.location.nearestStation },
          ]}
        />
      </Section>

      <Section title="給与・待遇" icon={<Banknote className="h-4 w-4" />}>
        <DefList
          items={[
            { label: "給与形態", value: job.salary.type },
            { label: "支給額", value: salary },
            { label: "基本給", value: job.salary.base },
            { label: "賞与", value: job.salary.bonus },
            {
              label: "年間休日数",
              value:
                job.benefits.annualHolidays !== null
                  ? `${job.benefits.annualHolidays}日`
                  : null,
            },
            { label: "保険", value: job.benefits.insurance },
          ]}
        />
      </Section>

      {job.description && (
        <Section title="仕事内容">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-800">
            {job.description}
          </p>
        </Section>
      )}

      <Section title="応募・連絡先" icon={<Phone className="h-4 w-4" />}>
        <DefList
          items={[
            { label: "担当者", value: job.contact.name },
            { label: "役職", value: job.contact.role },
            { label: "電話", value: job.contact.tel },
            {
              label: "メール",
              value: job.contact.email,
              renderValue: (val) => (
                <a className="text-primary-600 hover:underline" href={`mailto:${val}`}>
                  <Mail className="mr-1 inline h-3.5 w-3.5" />
                  {val}
                </a>
              ),
            },
          ]}
        />
      </Section>

      <Section title="期日" icon={<Calendar className="h-4 w-4" />}>
        <DefList
          items={[
            { label: "受付年月日", value: formatJpDate(job.dates.receivedAt) },
            { label: "求人有効期限", value: formatJpDate(job.dates.validUntil) },
            { label: "紹介期限日", value: formatJpDate(job.dates.applyBy) },
          ]}
        />
      </Section>

      <p className="mt-8 flex items-start gap-2  border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        この求人は公共職業安定所の公開情報より転載しています。応募方法・最新情報は公共職業安定所窓口でもご確認ください。
      </p>
    </article>
  )
}

function BackLink() {
  return (
    <Link
      href="/hw-jobs"
      className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600"
    >
      <ChevronLeft className="h-4 w-4" />
      求人一覧に戻る
    </Link>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="mt-6  border bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-700">
        {icon}
        {title}
      </h2>
      <div className="mt-3">{children}</div>
    </section>
  )
}

interface DefItem {
  label: string
  value: string | null | undefined
  renderValue?: (value: string) => React.ReactNode
}

function DefList({ items }: { items: DefItem[] }) {
  const valid = items.filter((item) => item.value !== null && item.value !== undefined && item.value !== "")
  if (valid.length === 0) {
    return <p className="text-xs text-gray-400">情報なし</p>
  }
  return (
    <dl className="grid gap-x-4 gap-y-2 text-sm sm:grid-cols-[120px_1fr]">
      {valid.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-gray-500">{item.label}</dt>
          <dd className="text-gray-900">
            {item.renderValue ? item.renderValue(item.value as string) : (item.value as string)}
          </dd>
        </div>
      ))}
    </dl>
  )
}


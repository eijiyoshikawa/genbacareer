import type { HwJob } from "@/lib/jobs-api"

/**
 * Google for Jobs 用 JSON-LD（schema.org JobPosting）。
 * HelloWork API 由来の求人。要求された必須・推奨フィールドを網羅する。
 *
 * @see https://developers.google.com/search/docs/appearance/structured-data/job-posting
 */
export function HwJobStructuredData({ job }: { job: HwJob }) {
  const baseSalary = buildBaseSalary(job)
  const datePosted = job.dates.receivedAt
  // validThrough は明示値 > 受付期限 > 受付日+90 日 の優先度
  const validThrough =
    job.dates.applyBy ??
    job.dates.validUntil ??
    (datePosted ? addDays(datePosted, 90) : undefined)

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title ?? job.occupation ?? "求人",
    description: buildDescription(job),
    ...(datePosted && { datePosted }),
    ...(validThrough && { validThrough }),
    employmentType: mapEmploymentType(job.employmentType ?? job.jobType),
    hiringOrganization: job.company.name
      ? {
          "@type": "Organization",
          name: job.company.name,
          ...(job.company.website ? { sameAs: [job.company.website] } : {}),
        }
      : { "@type": "Organization", name: "非公開" },
    jobLocation: buildJobLocation(job),
    applicantLocationRequirements: {
      "@type": "Country",
      name: "JP",
    },
    ...(baseSalary ? { baseSalary } : {}),
    // directApply: HelloWork 由来の求人はサイト内に応募フォームが無く
    // (「応募方法はハローワーク窓口でご確認ください」表示のみ)、実際には
    // サイト内で直接応募できない。true を偽って主張しないよう省略する
    // （/jobs/[id] 側は実際に LINE 応募フォームがあるため true のままでよい）。
    identifier: {
      "@type": "PropertyValue",
      name: "公共求人番号",
      value: job.kjno,
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}

/** 日本語雇用形態文字列を Google for Jobs vocab にマッピング */
function mapEmploymentType(value: string | null | undefined): string {
  if (!value) return "OTHER"
  if (/正社員|フルタイム/i.test(value)) return "FULL_TIME"
  if (/パート|アルバイト/i.test(value)) return "PART_TIME"
  if (/契約|嘱託/i.test(value)) return "CONTRACTOR"
  if (/派遣/i.test(value)) return "TEMPORARY"
  if (/インターン/i.test(value)) return "INTERN"
  if (/日雇い/i.test(value)) return "PER_DIEM"
  return "OTHER"
}

function buildDescription(job: HwJob): string {
  if (job.description && job.description.trim().length >= 20) {
    return job.description
  }
  // 説明が空 / 短い場合はタイトル + 勤務地 + 業務内容で補完
  const parts: string[] = []
  parts.push(job.title ?? job.occupation ?? "求人")
  if (job.location.prefecture) parts.push(`勤務地: ${job.location.prefecture}`)
  if (job.occupation) parts.push(`職種: ${job.occupation}`)
  return parts.join("。 ")
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString()
}

function buildJobLocation(job: HwJob) {
  if (!job.location.prefecture && !job.location.address) return undefined
  return {
    "@type": "Place",
    address: {
      "@type": "PostalAddress",
      addressCountry: "JP",
      ...(job.location.prefecture ? { addressRegion: job.location.prefecture } : {}),
      ...(job.location.address ? { streetAddress: job.location.address } : {}),
      ...(job.location.employerPostalCode
        ? { postalCode: job.location.employerPostalCode }
        : {}),
    },
  }
}

function buildBaseSalary(job: HwJob) {
  if (job.salary.min === null && job.salary.max === null) return null
  return {
    "@type": "MonetaryAmount",
    currency: "JPY",
    value: {
      "@type": "QuantitativeValue",
      ...(job.salary.min !== null ? { minValue: job.salary.min } : {}),
      ...(job.salary.max !== null ? { maxValue: job.salary.max } : {}),
      unitText: mapUnit(job.salary.type),
    },
  }
}

function mapUnit(type: string | null): string {
  if (!type) return "MONTH"
  if (type.includes("時給")) return "HOUR"
  if (type.includes("日給")) return "DAY"
  if (type.includes("年俸")) return "YEAR"
  return "MONTH"
}

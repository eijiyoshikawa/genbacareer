import type { ReactNode } from "react"
import { Globe } from "@phosphor-icons/react/dist/ssr"
import { SnsLinks } from "@/components/jobs/sns-links"

/**
 * 求人詳細「会社概要」テーブル（建職バンク参考）。
 * 左ラベル / 右内容の行を罫線で区切る表形式。常時展開。
 * ※ 資本金・設立はデータに無いため、保有項目のみ表示。
 */

type CompanyOverviewData = {
  company: {
    name: string
    industry: string | null
    prefecture: string | null
    city: string | null
    address: string | null
    employeeCount: string | null
    description: string | null
    websiteUrl: string | null
    instagramUrl: string | null
    tiktokUrl: string | null
    facebookUrl: string | null
    xUrl: string | null
    youtubeUrl: string | null
  }
  companyUrl: string | null
  businessContent: string | null
  companyFeatures: string | null
}

const isBlank = (v: string | null | undefined) => !v || v.trim() === ""

export function CompanyOverview({
  company,
  companyUrl,
  businessContent,
  companyFeatures,
}: CompanyOverviewData) {
  const url = company.websiteUrl ?? companyUrl
  const location = [company.prefecture, company.city, company.address]
    .filter((v) => !isBlank(v))
    .join(" ")
  const hasSns = !!(
    company.instagramUrl ||
    company.tiktokUrl ||
    company.facebookUrl ||
    company.xUrl ||
    company.youtubeUrl
  )

  return (
    <section id="company">
      <h2 className="section-bar mb-1 text-xl font-bold text-gray-900 sm:text-2xl">
        会社概要
      </h2>
      <div className="border-t-2 border-gray-200">
        <Row label="会社名">{company.name}</Row>
        {url && (
          <Row label="会社HP">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary-700 underline underline-offset-2 hover:no-underline"
            >
              {url}
            </a>
          </Row>
        )}
        {!isBlank(location) && <Row label="所在地">{location}</Row>}
        {!isBlank(company.employeeCount) && (
          <Row label="従業員数">{company.employeeCount}名</Row>
        )}
        {!isBlank(company.industry) && <Row label="業種">{company.industry}</Row>}
        {!isBlank(businessContent) && (
          <Row label="事業内容">
            <p className="whitespace-pre-wrap">{businessContent}</p>
          </Row>
        )}
        {!isBlank(companyFeatures) && (
          <Row label="会社の特長">
            <p className="whitespace-pre-wrap">{companyFeatures}</p>
          </Row>
        )}
        {!isBlank(company.description) && (
          <Row label="会社紹介">
            <p className="whitespace-pre-wrap">{company.description}</p>
          </Row>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {company.websiteUrl && (
          <a
            href={company.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-primary-500 px-4 py-2 text-sm font-bold text-primary-700 transition hover:bg-primary-50"
          >
            <Globe weight="duotone" className="h-4 w-4" />
            {company.name} 公式HPを見る
          </a>
        )}
        {hasSns && (
          <SnsLinks
            sns={{
              instagramUrl: company.instagramUrl,
              tiktokUrl: company.tiktokUrl,
              facebookUrl: company.facebookUrl,
              xUrl: company.xUrl,
              youtubeUrl: company.youtubeUrl,
            }}
          />
        )}
      </div>
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-gray-200 py-4 sm:grid-cols-[160px_minmax(0,1fr)] sm:gap-6">
      <span className="text-sm font-bold text-gray-900">{label}</span>
      <div className="min-w-0 text-sm leading-relaxed text-gray-700">{children}</div>
    </div>
  )
}

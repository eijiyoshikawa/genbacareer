import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import {
  CONSTRUCTION_CATEGORY_VALUES,
  isConstructionCategory,
} from "@/lib/categories"
import { buildPrefectureCategoryDescription } from "@/lib/seo-text"
import { PREFECTURE_SLUG_TO_LABEL as PREFECTURES } from "@/lib/prefectures"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import {
  GuestSignupCta,
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"

// /[prefecture]/[category] の category は建設業のみ受け付ける（"other" は除外）。
const CONSTRUCTION_CATEGORY_SET: ReadonlySet<string> = new Set(
  CONSTRUCTION_CATEGORY_VALUES
)

// auth() で cookie を読むため、自動的に dynamic レンダリングになる。
export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

const CATEGORIES: Record<string, string> = {
  construction: "建築・躯体工事",
  civil: "土木工事",
  electrical: "電気・設備工事",
  interior: "内装・仕上げ工事",
  demolition: "解体・産廃",
  driver: "ドライバー・重機",
  management: "施工管理・現場監督",
  survey: "測量・設計",
  other: "その他",
}

type Props = {
  params: Promise<{ prefecture: string; category: string }>
}

export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { prefecture, category } = await params
  const prefLabel = PREFECTURES[prefecture]
  const catLabel = CATEGORIES[category]

  if (!prefLabel || !catLabel) {
    return { title: "ページが見つかりません" }
  }

  const title = `${prefLabel}の${catLabel}求人一覧`
  const description = isConstructionCategory(category)
    ? buildPrefectureCategoryDescription(prefLabel, catLabel, category)
    : `${prefLabel}で募集中の${catLabel}の求人情報を掲載。給与・勤務地・雇用形態など詳細条件で検索できます。`

  return {
    title,
    description,
    alternates: { canonical: `/${prefecture}/${category}` },
    openGraph: { title, description },
  }
}

export default async function PrefectureCategoryPage({ params }: Props) {
  const { prefecture, category } = await params
  const prefLabel = PREFECTURES[prefecture]
  const catLabel = CATEGORIES[category]

  if (!prefLabel || !catLabel) {
    notFound()
  }

  // category は CATEGORIES の建設業 9 カテゴリでバリデーション済み（other 含む）。
  // ただし other は SEO 対象外なので念のため除外し、見つからなければ notFound。
  if (!CONSTRUCTION_CATEGORY_SET.has(category)) {
    notFound()
  }

  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件で打ち切り。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  const fullLimit = 100
  const limit = loggedIn ? fullLimit : GUEST_LIMIT

  const where = {
    status: "active",
    prefecture: prefLabel,
    category,
  }

  const [jobs, total] = await Promise.all([
    prisma.job
      .findMany({
        where,
        select: {
          id: true,
          title: true,
          category: true,
          employmentType: true,
          salaryMin: true,
          salaryMax: true,
          salaryType: true,
          prefecture: true,
          city: true,
          source: true,
          tags: true,
          company: {
            select: { name: true, logoUrl: true, gbizData: true },
          },
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
      })
      .catch(() => []),
    prisma.job.count({ where }).catch(() => 0),
  ])

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "トップ", item: SITE_URL },
      {
        "@type": "ListItem",
        position: 2,
        name: "求人一覧",
        item: `${SITE_URL}/jobs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: prefLabel,
        item: `${SITE_URL}/${prefecture}`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: catLabel,
        item: `${SITE_URL}/${prefecture}/${category}`,
      },
    ],
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          トップ
        </Link>
        <span className="mx-1">/</span>
        <Link href="/jobs" className="hover:text-gray-700">
          求人一覧
        </Link>
        <span className="mx-1">/</span>
        <Link href={`/${prefecture}`} className="hover:text-gray-700">
          {prefLabel}
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">{catLabel}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">
        {prefLabel}の{catLabel}求人
      </h1>
      <p className="mt-2 text-gray-600">
        {prefLabel}で現在募集中の{catLabel}の求人は{" "}
        <span className="font-semibold text-primary-600">{total}</span> 件です。
        {!loggedIn && total > GUEST_LIMIT && (
          <span className="ml-1 text-xs text-gray-500">
            （上位 {GUEST_LIMIT} 件のみお試し表示）
          </span>
        )}
      </p>

      {!loggedIn && total > GUEST_LIMIT && (
        <div className="mt-4">
          <GuestTrialBanner limit={GUEST_LIMIT} total={total} />
        </div>
      )}

      {jobs.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            現在、{prefLabel}の{catLabel}求人は掲載されていません。
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-block bg-primary-600 px-6 py-2 text-sm font-medium text-white hover:bg-primary-700"
          >
            すべての求人を見る
          </Link>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} loggedIn={loggedIn} />
            ))}
          </div>
          {!loggedIn && total > jobs.length && (
            <div className="mt-6">
              <GuestSignupCta
                total={total}
                shown={jobs.length}
                callbackUrl={`/${prefecture}/${category}`}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

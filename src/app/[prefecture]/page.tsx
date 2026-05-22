import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { CONSTRUCTION_CATEGORY_VALUES } from "@/lib/categories"
import { buildPrefectureDescription } from "@/lib/seo-text"
import { PREFECTURE_SLUG_TO_LABEL as PREFECTURES } from "@/lib/prefectures"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import {
  GuestSignupCta,
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"

// auth() で cookie を読むため、自動的に dynamic レンダリングになる。
// ISR 設定は無効になるので削除し、明示的に force-dynamic を宣言する。
export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

const CATEGORY_LABELS: Record<string, string> = {
  construction: "建築・躯体工事",
  civil: "土木工事",
  electrical: "電気・設備工事",
  interior: "内装・仕上げ工事",
  demolition: "解体・産廃",
  driver: "ドライバー・重機",
  management: "施工管理・現場監督",
  survey: "測量・設計",
  manufacturing: "製造・工場",
  office: "事務",
  sales: "営業・販売",
  service: "サービス・接客",
  it: "IT・エンジニア",
  other: "その他",
}

type Props = {
  params: Promise<{ prefecture: string }>
}

// ビルド時に 47 都道府県を prerender すると DATABASE_URL がタイミングにより
// 一時的に解決できないケースで build が落ちる。空配列を返し、初回リクエストで
// オンデマンド SSR + ISR キャッシュさせる。
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { prefecture } = await params
  const prefLabel = PREFECTURES[prefecture]

  if (!prefLabel) {
    return { title: "ページが見つかりません" }
  }

  const title = `${prefLabel}の求人一覧`
  const description = buildPrefectureDescription(prefLabel)

  return {
    title,
    description,
    alternates: { canonical: `/${prefecture}` },
    openGraph: { title, description },
  }
}

export default async function PrefecturePage({ params }: Props) {
  const { prefecture } = await params
  const prefLabel = PREFECTURES[prefecture]

  if (!prefLabel) {
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
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
  }

  // DB 未到達でもページが落ちないよう、try/catch で空配列にフォールバック。
  const [jobs, total, categoryCounts] = await Promise.all([
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
    prisma.job
      .groupBy({
        by: ["category"],
        where,
        _count: { _all: true },
      })
      .catch(() => [] as Array<{ category: string; _count: { _all: number } }>),
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
        <span className="text-gray-900">{prefLabel}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">
        {prefLabel}の求人
      </h1>
      <p className="mt-2 text-gray-600">
        {prefLabel}で現在募集中の求人は{" "}
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

      {/* カテゴリ別ナビ */}
      {categoryCounts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">職種から探す</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {categoryCounts
              .sort((a, b) => b._count._all - a._count._all)
              .map((cat) => {
                const label = CATEGORY_LABELS[cat.category] ?? cat.category
                return (
                  <li key={cat.category}>
                    <Link
                      href={`/${prefecture}/${cat.category}`}
                      className="flex items-center justify-between border bg-white px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <span className="text-gray-800">{label}</span>
                      <span className="text-gray-500">
                        {cat._count._all} 件
                      </span>
                    </Link>
                  </li>
                )
              })}
          </ul>
        </section>
      )}

      {/* 求人一覧 */}
      <section className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">最新の求人</h2>
        {jobs.length === 0 ? (
          <div className="mt-6 text-center">
            <p className="text-gray-500">
              現在、{prefLabel}の求人は掲載されていません。
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
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} loggedIn={loggedIn} />
              ))}
            </div>
            {!loggedIn && total > jobs.length && (
              <div className="mt-6">
                <GuestSignupCta
                  total={total}
                  shown={jobs.length}
                  callbackUrl={`/${prefecture}`}
                />
              </div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

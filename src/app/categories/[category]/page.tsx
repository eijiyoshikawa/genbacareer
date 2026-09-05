import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { jsonLdString } from "@/lib/json-ld"
import {
  CATEGORIES,
  CONSTRUCTION_CATEGORY_VALUES,
  isConstructionCategory,
} from "@/lib/categories"
import { PREFECTURE_LABEL_TO_SLUG } from "@/lib/prefectures"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import {
  GuestSignupCta,
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"

// auth() で cookie を読むため、自動的に dynamic レンダリングになる。
export const dynamic = "force-dynamic"

const SITE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? "https://www.genbacareer.jp"

type Props = {
  params: Promise<{ category: string }>
}

// ビルド時の DB 接続枯渇を避けるため、初回リクエスト時に動的生成する。
// ISR (revalidate=21600) でユーザー体感は維持される。
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const cat = CATEGORIES.find((c) => c.value === category)
  if (!cat || !isConstructionCategory(category)) {
    return { title: "ページが見つかりません" }
  }

  const title = `全国の${cat.label}求人 | ゲンバキャリア`
  const description = `全国の${cat.label}求人を職種ごとにご紹介。給与・勤務地・雇用形態など詳細条件で検索できます。建設業特化の求人サイト「ゲンバキャリア」。`

  return {
    title,
    description,
    alternates: { canonical: `/categories/${category}` },
    openGraph: { title, description },
  }
}

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const cat = CATEGORIES.find((c) => c.value === category)
  if (!cat || !isConstructionCategory(category)) {
    notFound()
  }

  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件で打ち切り。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  const fullLimit = 50
  const limit = loggedIn ? fullLimit : GUEST_LIMIT

  const [jobs, prefectureCounts, totalCount] = await Promise.all([
    prisma.job
      .findMany({
        where: { status: "active", category },
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
          company: { select: { name: true, logoUrl: true, gbizData: true } },
        },
        orderBy: { publishedAt: "desc" },
        take: limit,
      })
      .catch(() => []),
    prisma.job
      .groupBy({
        by: ["prefecture"],
        where: { status: "active", category },
        _count: { _all: true },
      })
      .catch(
        () => [] as Array<{ prefecture: string | null; _count: { _all: number } }>
      ),
    prisma.job
      .count({ where: { status: "active", category } })
      .catch(() => 0),
  ])

  // BreadcrumbList structured data
  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "トップ",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "求人一覧",
        item: `${SITE_URL}/jobs`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: cat.label,
        item: `${SITE_URL}/categories/${category}`,
      },
    ],
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdString(breadcrumb) }}
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
        <span className="text-gray-900">{cat.label}</span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">
        全国の{cat.label}求人
      </h1>
      <p className="mt-2 text-gray-600">
        全国で現在募集中の{cat.label}の求人は{" "}
        <span className="font-semibold text-primary-600">{totalCount}</span>{" "}
        件です。
        {!loggedIn && totalCount > GUEST_LIMIT && (
          <span className="ml-1 text-xs text-gray-500">
            （上位 {GUEST_LIMIT} 件のみお試し表示）
          </span>
        )}
      </p>

      {!loggedIn && totalCount > GUEST_LIMIT && (
        <div className="mt-4">
          <GuestTrialBanner limit={GUEST_LIMIT} total={totalCount} />
        </div>
      )}

      {/* 都道府県別ナビ */}
      {prefectureCounts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900">
            都道府県から探す
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 md:grid-cols-3">
            {prefectureCounts
              .slice()
              .sort((a, b) => b._count._all - a._count._all)
              .map((p) => {
                if (!p.prefecture) return null
                const slug = PREFECTURE_LABEL_TO_SLUG[p.prefecture]
                if (!slug) return null
                return (
                  <li key={p.prefecture}>
                    <Link
                      href={`/${slug}/${category}`}
                      className="flex items-center justify-between border bg-white px-4 py-3 text-sm hover:bg-gray-50"
                    >
                      <span className="text-gray-800">{p.prefecture}</span>
                      <span className="text-gray-500">
                        {p._count._all} 件
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
        <h2 className="text-lg font-semibold text-gray-900">
          最新の{cat.label}求人
        </h2>
        {jobs.length === 0 ? (
          <div className="mt-6 text-center">
            <p className="text-gray-500">
              現在、{cat.label}の求人は掲載されていません。
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
            {!loggedIn && totalCount > jobs.length && (
              <div className="mt-6">
                <GuestSignupCta
                  total={totalCount}
                  shown={jobs.length}
                  callbackUrl={`/categories/${category}`}
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* 他カテゴリへのナビ */}
      <section className="mt-12 border-t pt-8">
        <h2 className="text-lg font-semibold text-gray-900">他の職種を探す</h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {CONSTRUCTION_CATEGORY_VALUES.filter((v) => v !== category).map(
            (value) => {
              const other = CATEGORIES.find((c) => c.value === value)
              if (!other) return null
              return (
                <li key={value}>
                  <Link
                    href={`/categories/${value}`}
                    className="inline-block border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {other.label}
                  </Link>
                </li>
              )
            }
          )}
        </ul>
      </section>
    </div>
  )
}

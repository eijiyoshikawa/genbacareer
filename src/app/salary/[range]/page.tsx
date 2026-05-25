import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { buildPublicJobOrderBy } from "@/lib/job-sort"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import {
  SALARY_RANGES,
  getSalaryRangeBySlug,
} from "@/lib/longtail-lp"
import { CONSTRUCTION_CATEGORY_VALUES, CATEGORIES } from "@/lib/categories"
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/structured-data"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import {
  GuestSignupCta,
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"

// auth() で cookie を読むため、自動的に dynamic レンダリングになる。
export const dynamic = "force-dynamic"
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Props = {
  params: Promise<{ range: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { range } = await params
  const lp = getSalaryRangeBySlug(range)
  if (!lp) return { title: "ページが見つかりません" }
  return {
    title: lp.heading,
    description: lp.description,
    alternates: { canonical: `/salary/${range}` },
    openGraph: {
      type: "website",
      title: lp.heading,
      description: lp.description,
      url: `/salary/${range}`,
    },
  }
}

export default async function SalaryRangePage({ params }: Props) {
  const { range } = await params
  const lp = getSalaryRangeBySlug(range)
  if (!lp) notFound()

  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件で打ち切り。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  const fullLimit = 60
  const limit = loggedIn ? fullLimit : GUEST_LIMIT

  const where = {
    status: "active",
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
    salaryMin: { gte: lp.minMonthly },
  }

  // 月給 X 万円以上 = salaryMin >= lp.minMonthly && salaryType in (monthly, null)
  // null は不明扱いだが除外すると hellowork 系がほとんど消えるため許容する。
  const [jobs, total] = await Promise.all([
    prisma.job
      .findMany({
        where,
        orderBy: buildPublicJobOrderBy("recommended"),
        take: limit,
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
      })
      .catch(() => []),
    prisma.job.count({ where }).catch(() => 0),
  ])

  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "求人検索", url: "/jobs" },
    { name: "給与から探す", url: "/salary" },
    { name: lp.label, url: `/salary/${range}` },
  ])

  const collectionPage = generateCollectionPageSchema({
    url: `/salary/${range}`,
    name: lp.heading,
    description: lp.description,
    numberOfItems: jobs.length,
  })

  const itemList = generateItemListSchema(
    jobs.slice(0, 20).map((j) => ({
      url: `/jobs/${j.id}`,
      name: j.title,
    })),
    { itemListName: lp.heading },
  )

  return (
    <div className="bg-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionPage) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemList) }}
      />

      <header className="border-b bg-warm-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <nav className="text-xs text-gray-500 mb-2">
            <Link href="/" className="hover:text-primary-600">トップ</Link>
            <span className="mx-1">/</span>
            <Link href="/jobs" className="hover:text-primary-600">求人検索</Link>
            <span className="mx-1">/</span>
            <span>給与から探す</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {lp.heading}
          </h1>
          <p className="mt-3 text-sm text-gray-700 leading-relaxed max-w-2xl">
            {lp.description}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {total} 件の求人が見つかりました
            {!loggedIn && total > GUEST_LIMIT && (
              <span className="ml-1">
                （上位 {GUEST_LIMIT} 件のみお試し表示）
              </span>
            )}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {!loggedIn && total > GUEST_LIMIT && (
          <div className="mb-4">
            <GuestTrialBanner limit={GUEST_LIMIT} total={total} />
          </div>
        )}

        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">
            該当する求人が見つかりませんでした。条件を変えてお試しください。
          </p>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} loggedIn={loggedIn} />
              ))}
            </div>
            {!loggedIn && total > jobs.length && (
              <div className="mt-6">
                <GuestSignupCta
                  total={total}
                  shown={jobs.length}
                  callbackUrl={`/salary/${range}`}
                />
              </div>
            )}
          </>
        )}
      </section>

      {/* 他の年収レンジへの内部リンク */}
      <section className="border-t bg-warm-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-sm font-bold text-gray-700">他の年収帯で探す</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {SALARY_RANGES.filter((r) => r.slug !== range).map((r) => (
              <li key={r.slug}>
                <Link
                  href={`/salary/${r.slug}`}
                  className="press inline-flex items-center bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {r.label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-6 text-sm font-bold text-gray-700">職種から探す</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.value !== "other").map((c) => (
              <li key={c.value}>
                <Link
                  href={`/categories/${c.value}`}
                  className="press inline-flex items-center bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {c.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  )
}

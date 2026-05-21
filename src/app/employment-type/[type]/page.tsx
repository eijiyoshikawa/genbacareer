import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import {
  EMPLOYMENT_LPS,
  getEmploymentLpBySlug,
} from "@/lib/longtail-lp"
import { CONSTRUCTION_CATEGORY_VALUES, CATEGORIES } from "@/lib/categories"
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/structured-data"

// build 高速化: SSG 時に prerender せず、初回リクエストで生成 → ISR キャッシュ
export const revalidate = 21600
export const dynamicParams = true

export function generateStaticParams() {
  return []
}

type Props = {
  params: Promise<{ type: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { type } = await params
  const lp = getEmploymentLpBySlug(type)
  if (!lp) return { title: "ページが見つかりません" }
  return {
    title: lp.heading,
    description: lp.description,
    alternates: { canonical: `/employment-type/${type}` },
    openGraph: {
      type: "website",
      title: lp.heading,
      description: lp.description,
      url: `/employment-type/${type}`,
    },
  }
}

export default async function EmploymentTypeLpPage({ params }: Props) {
  const { type } = await params
  const lp = getEmploymentLpBySlug(type)
  if (!lp) notFound()

  const jobs = await prisma.job
    .findMany({
      where: {
        status: "active",
        category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
        employmentType: lp.employmentTypeValue,
      },
      orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
      take: 60,
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
    .catch(() => [])

  const breadcrumb = generateBreadcrumbSchema([
    { name: "トップ", url: "/" },
    { name: "求人検索", url: "/jobs" },
    { name: "雇用形態から探す", url: "/employment-type" },
    { name: lp.label, url: `/employment-type/${type}` },
  ])

  const collectionPage = generateCollectionPageSchema({
    url: `/employment-type/${type}`,
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
            <span>雇用形態から探す</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            {lp.heading}
          </h1>
          <p className="mt-3 text-sm text-gray-700 leading-relaxed max-w-2xl">
            {lp.description}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            {jobs.length} 件の求人が見つかりました
          </p>
        </div>
      </header>

      {/* 雇用形態の説明 */}
      <section className="border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 bg-blue-50/30">
          <h2 className="text-sm font-bold text-gray-900">
            {lp.label} とは
          </h2>
          <p className="mt-1 text-sm text-gray-700 leading-relaxed">
            {lp.about}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        {jobs.length === 0 ? (
          <p className="text-sm text-gray-500">
            該当する求人が見つかりませんでした。
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      {/* 他の雇用形態 + 職種 */}
      <section className="border-t bg-warm-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-sm font-bold text-gray-700">
            他の雇用形態から探す
          </h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {EMPLOYMENT_LPS.filter((e) => e.slug !== type).map((e) => (
              <li key={e.slug}>
                <Link
                  href={`/employment-type/${e.slug}`}
                  className="press inline-flex items-center bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {e.label}
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

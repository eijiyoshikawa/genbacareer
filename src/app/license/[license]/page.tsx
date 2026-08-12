import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"
import { Prisma } from "@prisma/client"
import {
  LICENSE_LPS,
  getLicenseLpBySlug,
} from "@/lib/longtail-lp"
import { CONSTRUCTION_CATEGORY_VALUES, getCategoryLabel } from "@/lib/categories"
import {
  generateBreadcrumbSchema,
  generateCollectionPageSchema,
  generateItemListSchema,
} from "@/lib/structured-data"
import { auth } from "@/lib/auth"
import { GUEST_LIMIT } from "@/lib/guest-job-access"
import {
  GuestTrialBanner,
} from "@/components/jobs/guest-signup-cta"
import { Certificate, BookOpen } from "@phosphor-icons/react/dist/ssr"

// auth() で cookie を読むため、自動的に dynamic レンダリングになる。
// (他の longtail LP と同じく GUEST_LIMIT ゲートのため ISR は使わない)
export const dynamic = "force-dynamic"
export const dynamicParams = true

export function generateStaticParams() {
  // 空配列を返してビルド時 prerender を回避 (dynamicParams = true なので個別 slug は SSR で処理)
  return []
}

type Props = {
  params: Promise<{ license: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { license } = await params
  const lp = getLicenseLpBySlug(license)
  if (!lp) return { title: "ページが見つかりません" }
  return {
    title: lp.heading,
    description: lp.description,
    alternates: { canonical: `/license/${license}` },
    openGraph: {
      type: "website",
      title: lp.heading,
      description: lp.description,
      url: `/license/${license}`,
    },
  }
}

export default async function LicenseLpPage({ params }: Props) {
  const { license } = await params
  const lp = getLicenseLpBySlug(license)
  if (!lp) notFound()

  // 求職者ログイン時のみ全件閲覧可。未ログインは GUEST_LIMIT (15) 件で打ち切り。
  const session = await auth().catch(() => null)
  const loggedIn = !!session?.user?.id
  const fullLimit = 30
  const limit = loggedIn ? fullLimit : GUEST_LIMIT

  // タイトル / tags に資格名が含まれる求人を抽出。
  // requirements / description の contains は LIKE %term% で巨大テーブルに対して
  // 60s タイムアウトする実績があるため、tags (GIN index 高速) と title のみに絞る。
  const OR: Prisma.JobWhereInput[] = lp.searchTerms.flatMap((term) => [
    { tags: { has: term } },
    { title: { contains: term, mode: "insensitive" } },
  ])

  const where: Prisma.JobWhereInput = {
    status: "active",
    category: { in: [...CONSTRUCTION_CATEGORY_VALUES] },
    OR,
  }

  const [jobs, total] = await Promise.all([
    prisma.job
      .findMany({
        where,
        orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
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
    { name: "資格から探す", url: "/license" },
    { name: lp.label, url: `/license/${license}` },
  ])

  const collectionPage = generateCollectionPageSchema({
    url: `/license/${license}`,
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
            <span>資格から探す</span>
          </nav>
          <p className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5">
            <Certificate weight="fill" className="h-3.5 w-3.5" />
            国家資格
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-gray-900">
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

      {/* 資格の説明 */}
      <section className="border-b">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 flex items-start gap-3 bg-blue-50/30">
          <BookOpen weight="duotone" className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h2 className="text-sm font-bold text-gray-900">
              {lp.label} について
            </h2>
            <p className="mt-1 text-sm text-gray-700 leading-relaxed">
              {lp.about}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
        <h2 className="text-base sm:text-lg font-bold text-gray-900 section-bar">
          {lp.label} を活かせる求人
        </h2>
        {!loggedIn && total > GUEST_LIMIT && (
          <div className="mt-4">
            <GuestTrialBanner limit={GUEST_LIMIT} total={total} />
          </div>
        )}
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            該当する求人が見つかりませんでした。下の他の資格もご覧ください。
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      {/* 他の資格 */}
      <section className="border-t bg-warm-50">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-8">
          <h2 className="text-sm font-bold text-gray-700">他の資格から探す</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {LICENSE_LPS.filter((l) => l.slug !== license).map((l) => (
              <li key={l.slug}>
                <Link
                  href={`/license/${l.slug}`}
                  className="press inline-flex items-center bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {lp.primaryCategory && (
            <>
              <h2 className="mt-6 text-sm font-bold text-gray-700">
                関連カテゴリ
              </h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                <li>
                  <Link
                    href={`/categories/${lp.primaryCategory}`}
                    className="press inline-flex items-center bg-white border border-gray-200 px-3 py-1.5 text-xs font-bold text-gray-700 hover:border-primary-400 hover:text-primary-700"
                  >
                    {getCategoryLabel(lp.primaryCategory)}
                  </Link>
                </li>
              </ul>
            </>
          )}
        </div>
      </section>
    </div>
  )
}

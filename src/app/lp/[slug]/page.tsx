import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import { JobCard } from "@/components/jobs/job-card"
import type { Metadata } from "next"

type Props = {
  params: Promise<{ slug: string }>
}

export const revalidate = 3600 // 1h ISR

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const page = await prisma.seoPage.findUnique({
    where: { slug },
    select: { title: true, metaDescription: true },
  })
  if (!page) return { title: "ページが見つかりません" }
  return {
    title: page.title,
    description: page.metaDescription ?? undefined,
  }
}

export async function generateStaticParams() {
  const pages = await prisma.seoPage.findMany({ select: { slug: true } })
  return pages.map((p) => ({ slug: p.slug }))
}

export default async function LandingPage({ params }: Props) {
  const { slug } = await params

  const seoPage = await prisma.seoPage.findUnique({ where: { slug } })
  if (!seoPage) notFound()

  const jobs = await prisma.job.findMany({
    where: {
      status: "active",
      prefecture: seoPage.prefecture,
      category: seoPage.category,
    },
    orderBy: { publishedAt: "desc" },
    take: 20,
    include: {
      company: { select: { id: true, name: true, logoUrl: true } },
    },
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-gray-900">
        {seoPage.h1Text ?? seoPage.title}
      </h1>
      {seoPage.bodyContent && (
        <div
          className="prose prose-sm mt-6 max-w-none text-gray-700"
          dangerouslySetInnerHTML={{ __html: seoPage.bodyContent }}
        />
      )}

      <h2 className="mt-10 text-xl font-bold text-gray-900">
        {seoPage.prefecture} の{seoPage.category}求人
      </h2>

      <div className="mt-4 space-y-3">
        {jobs.length === 0 ? (
          <div className="rounded-lg border bg-white p-12 text-center text-gray-500">
            該当する求人がまだありません。
          </div>
        ) : (
          jobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </div>

      <div className="mt-8 text-center">
        <Link
          href={`/jobs?prefecture=${encodeURIComponent(seoPage.prefecture)}&category=${encodeURIComponent(seoPage.category)}`}
          className="inline-block rounded-md bg-blue-600 px-6 py-3 text-sm font-medium text-white hover:bg-blue-700"
        >
          さらに求人を探す →
        </Link>
      </div>
    </div>
  )
}

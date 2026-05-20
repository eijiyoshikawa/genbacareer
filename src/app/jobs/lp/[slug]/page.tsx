/**
 * 13.2 地域 × 職種 LP 自動生成。
 *
 * URL: /jobs/lp/{prefSlug}-{category}
 *   例: /jobs/lp/tokyo-construction → 東京都の建築・躯体工事 求人
 *
 * 戦略:
 *   1. SeoPage table に手動で書き込んだエントリがあればそれを優先（運営の手入れが効く）
 *   2. なければ slug をパースしてオンザフライで生成（自動 LP）
 *   3. どちらも該当求人ゼロなら notFound()
 *
 * SEO 観点:
 *   - title / meta / h1 / 構造化データを LP ごとに最適化
 *   - 該当求人を 20 件まで一覧表示し内部リンクを稼ぐ
 *   - canonical を自身に設定
 *
 * ISR 24h でクロール容量に配慮。
 */

import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { getPrefectureNameBySlug } from "@/lib/prefecture-slugs"
import { CATEGORIES, getCategoryLabel } from "@/lib/categories"
import { JobCard } from "@/components/jobs/job-card"

export const revalidate = 86400 // 24h ISR

interface ParsedSlug {
  prefectureSlug: string
  prefectureName: string
  category: string
  categoryLabel: string
}

function parseSlug(slug: string): ParsedSlug | null {
  // 末尾が CATEGORIES.value のいずれかになるよう後方からマッチ
  const sortedCategories = [...CATEGORIES].sort(
    (a, b) => b.value.length - a.value.length
  )
  for (const c of sortedCategories) {
    const suffix = `-${c.value}`
    if (slug.endsWith(suffix)) {
      const prefSlug = slug.slice(0, slug.length - suffix.length)
      const prefName = getPrefectureNameBySlug(prefSlug)
      if (!prefName) return null
      return {
        prefectureSlug: prefSlug,
        prefectureName: prefName,
        category: c.value,
        categoryLabel: c.label,
      }
    }
  }
  return null
}

type Params = Promise<{ slug: string }>

export async function generateMetadata(props: {
  params: Params
}): Promise<Metadata> {
  const { slug } = await props.params
  const parsed = parseSlug(slug)
  if (!parsed) return { title: "求人一覧" }

  const seoPage = await prisma.seoPage.findUnique({ where: { slug } })
  const title =
    seoPage?.title ?? `${parsed.prefectureName}の${parsed.categoryLabel}求人`
  const description =
    seoPage?.metaDescription ??
    `${parsed.prefectureName}で${parsed.categoryLabel}の求人を探せます。現場で働く方のための求人サイト「ゲンバキャリア」が地域・職種別にまとめました。`

  return {
    title,
    description,
    alternates: { canonical: `/jobs/lp/${slug}` },
    openGraph: { title, description, type: "website" },
  }
}

export default async function JobLpPage(props: { params: Params }) {
  const { slug } = await props.params
  const parsed = parseSlug(slug)
  if (!parsed) notFound()

  const [seoPage, jobs, totalCount] = await Promise.all([
    prisma.seoPage.findUnique({ where: { slug } }),
    prisma.job.findMany({
      where: {
        status: "active",
        prefecture: parsed.prefectureName,
        category: parsed.category,
      },
      orderBy: [{ rankScore: "desc" }, { publishedAt: "desc" }],
      take: 20,
      select: {
        id: true,
        title: true,
        prefecture: true,
        city: true,
        salaryMin: true,
        salaryMax: true,
        salaryType: true,
        employmentType: true,
        category: true,
        source: true,
        tags: true,
        publishedAt: true,
        company: { select: { name: true, logoUrl: true } },
      },
    }),
    prisma.job.count({
      where: {
        status: "active",
        prefecture: parsed.prefectureName,
        category: parsed.category,
      },
    }),
  ])

  if (totalCount === 0 && !seoPage) {
    // 求人 0 件 かつ 運営手書きの LP も無いなら 404
    notFound()
  }

  const h1 =
    seoPage?.h1Text ??
    `${parsed.prefectureName}の${parsed.categoryLabel} 求人 ${totalCount} 件`

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav aria-label="パンくず" className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:underline">
          ホーム
        </Link>{" "}
        ›{" "}
        <Link href="/jobs" className="hover:underline">
          求人を探す
        </Link>{" "}
        › {parsed.prefectureName} › {parsed.categoryLabel}
      </nav>

      <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        {h1}
      </h1>

      {seoPage?.bodyContent ? (
        <div
          className="article-body mt-6 max-w-none"
          // 運営が手書きした HTML を信頼して埋め込む
          dangerouslySetInnerHTML={{ __html: seoPage.bodyContent }}
        />
      ) : (
        <div className="mt-6 space-y-3 text-sm text-gray-700 dark:text-gray-300">
          <p>
            {parsed.prefectureName}で{parsed.categoryLabel}
            の求人を探す方のためのまとめページです。
            正社員・契約社員・パート・アルバイトなど、雇用形態を問わず
            最新の現場求人を掲載しています。
          </p>
          <p>
            未経験歓迎・資格取得支援・寮完備など、現場ならではの待遇情報も
            充実。気になる求人があれば LINE 応募で気軽に問い合わせ可能です。
          </p>
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {parsed.prefectureName} × {parsed.categoryLabel} の求人一覧
        </h2>
        {jobs.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">
            現在、該当する求人はありません。
            <Link href="/jobs" className="ml-2 text-primary-600 hover:underline">
              全求人を見る →
            </Link>
          </p>
        ) : (
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {jobs.map((j) => (
              <JobCard key={j.id} job={j} />
            ))}
          </div>
        )}
      </section>

      {jobs.length > 0 && (
        <section className="mt-8 border-t pt-6">
          <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            他の地域 × 職種で探す
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.filter((c) => c.value !== parsed.category).map((c) => (
              <Link
                key={c.value}
                href={`/jobs/lp/${parsed.prefectureSlug}-${c.value}`}
                className="border border-gray-300 dark:border-gray-700 px-3 py-1 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                {parsed.prefectureName} × {getCategoryLabel(c.value)}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { JobCard } from "@/components/jobs/job-card"

export const revalidate = 21600 // 6 hours ISR

const PREFECTURES: Record<string, string> = {
  hokkaido: "北海道",
  aomori: "青森県",
  iwate: "岩手県",
  miyagi: "宮城県",
  akita: "秋田県",
  yamagata: "山形県",
  fukushima: "福島県",
  ibaraki: "茨城県",
  tochigi: "栃木県",
  gunma: "群馬県",
  saitama: "埼玉県",
  chiba: "千葉県",
  tokyo: "東京都",
  kanagawa: "神奈川県",
  niigata: "新潟県",
  toyama: "富山県",
  ishikawa: "石川県",
  fukui: "福井県",
  yamanashi: "山梨県",
  nagano: "長野県",
  gifu: "岐阜県",
  shizuoka: "静岡県",
  aichi: "愛知県",
  mie: "三重県",
  shiga: "滋賀県",
  kyoto: "京都府",
  osaka: "大阪府",
  hyogo: "兵庫県",
  nara: "奈良県",
  wakayama: "和歌山県",
  tottori: "鳥取県",
  shimane: "島根県",
  okayama: "岡山県",
  hiroshima: "広島県",
  yamaguchi: "山口県",
  tokushima: "徳島県",
  kagawa: "香川県",
  ehime: "愛媛県",
  kochi: "高知県",
  fukuoka: "福岡県",
  saga: "佐賀県",
  nagasaki: "長崎県",
  kumamoto: "熊本県",
  oita: "大分県",
  miyazaki: "宮崎県",
  kagoshima: "鹿児島県",
  okinawa: "沖縄県",
}

const CATEGORIES: Record<string, string> = {
  driver: "ドライバー",
  construction: "建設",
  manufacturing: "製造",
  logistics: "物流",
  nursing: "介護",
  cleaning: "清掃",
  security: "警備",
  food: "飲食",
  other: "その他",
}

type Props = {
  params: Promise<{ prefecture: string; category: string }>
}

export async function generateStaticParams() {
  // ビルド時にはDB接続不要。ISR(revalidate)でオンデマンド生成する。
  return []
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { prefecture, category } = await params
  const prefLabel = PREFECTURES[prefecture]
  const catLabel = CATEGORIES[category]

  if (!prefLabel || !catLabel) {
    return { title: "ページが見つかりません" }
  }

  const title = `${prefLabel}の${catLabel}求人一覧 | 求人検索`
  const description = `${prefLabel}で募集中の${catLabel}の求人情報を掲載。給与・勤務地・雇用形態など詳細条件で検索できます。`

  return {
    title,
    description,
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

  const jobs = await prisma.job.findMany({
    where: {
      status: "active",
      prefecture: prefLabel,
      category,
    },
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
        select: { name: true, logoUrl: true },
      },
    },
    orderBy: { publishedAt: "desc" },
    take: 100,
  })

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="mb-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-700">
          トップ
        </Link>
        <span className="mx-1">/</span>
        <Link href="/jobs" className="hover:text-gray-700">
          求人一覧
        </Link>
        <span className="mx-1">/</span>
        <span className="text-gray-900">
          {prefLabel} - {catLabel}
        </span>
      </nav>

      <h1 className="text-2xl font-bold text-gray-900">
        {prefLabel}の{catLabel}求人
      </h1>
      <p className="mt-2 text-gray-600">
        {prefLabel}で現在募集中の{catLabel}の求人は{" "}
        <span className="font-semibold text-blue-600">{jobs.length}</span> 件です。
      </p>

      {jobs.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-gray-500">
            現在、{prefLabel}の{catLabel}求人は掲載されていません。
          </p>
          <Link
            href="/jobs"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            すべての求人を見る
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  )
}

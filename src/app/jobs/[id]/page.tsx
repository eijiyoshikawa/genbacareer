import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import Link from "next/link"
import {
  MapPin,
  Banknote,
  Building2,
  Clock,
  CheckCircle,
  ArrowLeft,
} from "lucide-react"
import type { Metadata } from "next"
import { generateJobPostingSchema } from "@/lib/structured-data"
import { auth } from "@/lib/auth"
import { FavoriteButton } from "@/components/jobs/favorite-button"

type Props = {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    select: { title: true, prefecture: true, category: true },
  })
  if (!job) return { title: "求人が見つかりません" }
  return {
    title: job.title,
    description: `${job.prefecture}の${job.title}の求人詳細。`,
  }
}

export default async function JobDetailPage({ params }: Props) {
  const { id } = await params
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
          prefecture: true,
          city: true,
          address: true,
          employeeCount: true,
          description: true,
          logoUrl: true,
          websiteUrl: true,
        },
      },
    },
  })

  if (!job) notFound()

  // Increment view count
  prisma.job
    .update({ where: { id }, data: { viewCount: { increment: 1 } } })
    .catch(() => {})

  const session = await auth()
  const sessionRole = (session?.user as { role?: string } | undefined)?.role
  const isSeeker = !!session?.user?.id && (!sessionRole || sessionRole === "seeker")
  const isFavorite = isSeeker
    ? !!(await prisma.favorite.findUnique({
        where: {
          userId_jobId: { userId: session!.user!.id!, jobId: id },
        },
        select: { id: true },
      }))
    : false

  const jsonLd = generateJobPostingSchema({
    id: job.id,
    title: job.title,
    description: job.description,
    category: job.category,
    employmentType: job.employmentType,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    salaryType: job.salaryType,
    prefecture: job.prefecture,
    city: job.city,
    address: job.address,
    publishedAt: job.publishedAt,
    createdAt: job.createdAt,
    company: job.company
      ? {
          name: job.company.name,
          logoUrl: job.company.logoUrl,
          websiteUrl: job.company.websiteUrl,
        }
      : null,
  })

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        求人一覧に戻る
      </Link>

      <div className="mt-4 rounded-lg border bg-white p-6 shadow-sm">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            {job.source === "hellowork" && (
              <span className="mb-2 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                ハローワーク転載
              </span>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{job.title}</h1>
            <div className="mt-2">
              <FavoriteButton jobId={job.id} initial={isFavorite} enabled={isSeeker} />
            </div>
            {job.company && (
              <p className="mt-1 flex items-center gap-1 text-gray-600">
                <Building2 className="h-4 w-4" />
                {job.company.name}
              </p>
            )}
          </div>
        </div>

        {/* Key Info */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoItem
            icon={<MapPin className="h-5 w-5 text-gray-400" />}
            label="勤務地"
            value={`${job.prefecture}${job.city ? ` ${job.city}` : ""}${job.address ? ` ${job.address}` : ""}`}
          />
          {job.salaryMin && (
            <InfoItem
              icon={<Banknote className="h-5 w-5 text-gray-400" />}
              label="給与"
              value={formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
            />
          )}
          {job.employmentType && (
            <InfoItem
              icon={<Clock className="h-5 w-5 text-gray-400" />}
              label="雇用形態"
              value={employmentTypeLabel(job.employmentType)}
            />
          )}
        </div>

        {/* Description */}
        {job.description && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-900">仕事内容</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-700">
              {job.description}
            </p>
          </div>
        )}

        {/* Requirements */}
        {job.requirements && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">応募条件</h2>
            <p className="mt-2 whitespace-pre-wrap text-gray-700">
              {job.requirements}
            </p>
          </div>
        )}

        {/* Benefits */}
        {job.benefits.length > 0 && (
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900">福利厚生</h2>
            <ul className="mt-2 space-y-1">
              {job.benefits.map((b) => (
                <li key={b} className="flex items-center gap-2 text-gray-700">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  {b}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Tags */}
        {job.tags.length > 0 && (
          <div className="mt-6 flex flex-wrap gap-2">
            {job.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Apply CTA */}
        <div className="mt-8 border-t pt-6">
          <Link
            href={`/jobs/${job.id}/apply`}
            className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-6 py-3 text-base font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            この求人に応募する
          </Link>
        </div>

        {/* Source notice for HW jobs */}
        {job.source === "hellowork" && (
          <p className="mt-4 text-xs text-gray-400">
            この求人はハローワークインターネットサービスより転載しています。
            最新の情報はハローワークでご確認ください。
          </p>
        )}
      </div>

      {/* Company Info */}
      {job.company && (
        <div className="mt-6 rounded-lg border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">企業情報</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            <DlItem label="企業名" value={job.company.name} />
            {job.company.industry && (
              <DlItem label="業種" value={job.company.industry} />
            )}
            {job.company.employeeCount && (
              <DlItem label="従業員数" value={`${job.company.employeeCount}名`} />
            )}
            {job.company.address && (
              <DlItem label="所在地" value={job.company.address} />
            )}
          </dl>
          {job.company.description && (
            <p className="mt-4 text-sm text-gray-600">{job.company.description}</p>
          )}
        </div>
      )}
    </div>
  )
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-gray-50 p-3">
      {icon}
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-900">{value}</p>
      </div>
    </div>
  )
}

function DlItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{value}</dd>
    </div>
  )
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  const unit = type === "hourly" ? "時給" : type === "annual" ? "年収" : "月給"
  const fmt = (n: number) =>
    n >= 10000 ? `${(n / 10000).toFixed(0)}万` : `${n.toLocaleString()}`
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  if (min) return `${unit} ${fmt(min)}円〜`
  return ""
}

function employmentTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return labels[type] ?? type
}

/**
 * 求人比較ページ: /jobs/compare?ids=<id1>,<id2>,...
 *
 * 最大 4 件まで横並びで比較できる。
 * - 給与・勤務地・雇用形態・タグ・福利厚生 を同じ行で並べる
 * - 求人カードに「比較に追加」ボタンを追加（PR は最小実装、UI から ids を組み立てる導線は後追い OK）
 */

import { prisma } from "@/lib/db"
import Link from "next/link"
import { headers } from "next/headers"
import { ArrowLeft, X, MapPin, Money, Buildings } from "@phosphor-icons/react/dist/ssr"
import { getCategoryLabel } from "@/lib/categories"
import { auth } from "@/lib/auth"
import { getGuestAccessibleJobIds, isCrawlerUserAgent } from "@/lib/guest-job-access"
import type { Metadata } from "next"

export const dynamic = "force-dynamic"

const MAX_COMPARE = 4

export const metadata: Metadata = {
  title: "求人を比較する",
  robots: { index: false, follow: false },
}

type Props = {
  searchParams: Promise<{ ids?: string }>
}

export default async function CompareJobsPage({ searchParams }: Props) {
  const params = await searchParams
  const ids = (params.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_COMPARE)

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">求人を比較する</h1>
        <p className="mt-2 text-sm text-gray-500">
          比較したい求人 ID を URL に <code>?ids=ID1,ID2,ID3</code> の形で指定してください。
          求人カードの「比較に追加」から自動で組み立てるとスムーズです（最大 {MAX_COMPARE} 件）。
        </p>
        <Link
          href="/jobs"
          className="press mt-6 inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white"
        >
          求人検索へ
        </Link>
      </div>
    )
  }

  // 未登録ゲストは /jobs/[id] と同様「グローバル上位 15 件」しか詳細を見れない。
  // このページは複数 id を横断表示するため、ここで絞らないと未登録ゲートを回避できてしまう。
  let allowedIds = ids
  const session = await auth().catch(() => null)
  if (!session?.user?.id) {
    const hdrs = await headers()
    if (!isCrawlerUserAgent(hdrs.get("user-agent"))) {
      const guestIds = new Set(await getGuestAccessibleJobIds())
      allowedIds = ids.filter((id) => guestIds.has(id))
    }
  }

  const jobs = await prisma.job
    .findMany({
      where: { id: { in: allowedIds } },
      include: { company: { select: { name: true, logoUrl: true } } },
    })
    .catch(() => [])
  // 入力 ids の並び順を維持
  const order = new Map(ids.map((id, i) => [id, i]))
  jobs.sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999))

  if (jobs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900">求人を比較する</h1>
        <p className="mt-2 text-sm text-gray-500">
          指定された求人が見つかりませんでした。
        </p>
        <Link
          href="/jobs"
          className="press mt-6 inline-flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 px-4 py-2 text-sm font-bold text-white"
        >
          求人検索へ
        </Link>
      </div>
    )
  }

  function removeUrl(targetId: string): string {
    const rest = ids.filter((id) => id !== targetId)
    if (rest.length === 0) return "/jobs/compare"
    return `/jobs/compare?ids=${rest.join(",")}`
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1 text-sm text-primary-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        求人検索へ戻る
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-gray-900">
        求人を比較（{jobs.length} 件）
      </h1>
      <p className="mt-1 text-xs text-gray-500">
        最大 {MAX_COMPARE} 件まで横並びで比較できます。
      </p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 bg-white border-b w-32 z-10" />
              {jobs.map((job) => (
                <th
                  key={job.id}
                  className="border-b align-top px-3 py-3 min-w-[220px] text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="text-sm font-bold text-gray-900 hover:text-primary-700 line-clamp-2"
                    >
                      {job.title}
                    </Link>
                    <Link
                      href={removeUrl(job.id)}
                      className="text-gray-400 hover:text-red-600"
                      aria-label="比較から除外"
                    >
                      <X className="h-3 w-3" />
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm">
            <Row label="出典">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {job.source === "direct" ? "認定企業" : "公共求人"}
                </td>
              ))}
            </Row>
            <Row label="企業">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-800">
                  <Buildings weight="duotone" className="inline h-3 w-3 mr-1 text-gray-400" />
                  {job.company?.name ?? "—"}
                </td>
              ))}
            </Row>
            <Row label="職種">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {getCategoryLabel(job.category)}
                </td>
              ))}
            </Row>
            <Row label="雇用形態">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {employmentLabel(job.employmentType)}
                </td>
              ))}
            </Row>
            <Row label="給与">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-sm font-bold text-primary-700">
                  <Money weight="duotone" className="inline h-3.5 w-3.5 mr-0.5 text-primary-500" />
                  {formatSalary(job.salaryMin, job.salaryMax, job.salaryType)}
                </td>
              ))}
            </Row>
            <Row label="勤務地">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  <MapPin weight="duotone" className="inline h-3 w-3 mr-1 text-gray-400" />
                  {job.prefecture}
                  {job.city ? ` ${job.city}` : ""}
                </td>
              ))}
            </Row>
            <Row label="年間休日">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {job.annualHolidays != null ? `${job.annualHolidays} 日` : "—"}
                </td>
              ))}
            </Row>
            <Row label="勤務時間">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {job.workHours ?? "—"}
                </td>
              ))}
            </Row>
            <Row label="社会保険">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {job.insurance ?? "—"}
                </td>
              ))}
            </Row>
            <Row label="タグ">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs">
                  {job.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {job.tags.slice(0, 6).map((t) => (
                        <span
                          key={t}
                          className="inline-block bg-primary-50 text-primary-700 border border-primary-100 px-1.5 py-0.5"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              ))}
            </Row>
            <Row label="福利厚生">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-2 border-b text-xs text-gray-700">
                  {job.benefits.length > 0 ? job.benefits.join(" / ") : "—"}
                </td>
              ))}
            </Row>
            <Row label="詳細">
              {jobs.map((job) => (
                <td key={job.id} className="px-3 py-3 border-b">
                  <Link
                    href={`/jobs/${job.id}`}
                    className="press inline-flex items-center gap-1 bg-primary-600 hover:bg-primary-700 px-3 py-1.5 text-xs font-bold text-white"
                  >
                    求人を見る →
                  </Link>
                </td>
              ))}
            </Row>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <tr>
      <th className="sticky left-0 bg-warm-50 border-b text-left px-3 py-2 text-xs font-bold text-gray-600 align-top">
        {label}
      </th>
      {children}
    </tr>
  )
}

function formatSalary(
  min: number | null,
  max: number | null,
  type: string | null
): string {
  if (!min && !max) return "応相談"
  const unit =
    type === "hourly"
      ? "時給"
      : type === "annual"
        ? "年収"
        : type === "daily"
          ? "日給"
          : "月給"
  const useManYen = type !== "hourly" && type !== "daily"
  const fmt = (n: number) =>
    useManYen && n >= 10000 ? `${(n / 10000).toFixed(0)}万` : n.toLocaleString()
  if (min && max) return `${unit} ${fmt(min)}〜${fmt(max)}円`
  if (min) return `${unit} ${fmt(min)}円〜`
  return `${unit} 〜${fmt(max!)}円`
}

function employmentLabel(t: string | null): string {
  const labels: Record<string, string> = {
    full_time: "正社員",
    part_time: "パート",
    contract: "契約社員",
  }
  return t ? labels[t] ?? t : "—"
}

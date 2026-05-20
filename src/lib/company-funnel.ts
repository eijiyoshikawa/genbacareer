/**
 * 企業ダッシュボードのファネル KPI 集計。
 *
 * ステージ:
 *   1. 求人閲覧 (JobView)
 *   2. LINE 応募ボタンクリック (ApplicationClick)
 *   3. リード捕捉 (LineLead)
 *   4. 応募成立 (Application)
 *   5. 選考中 (Application status in [reviewing, interview, offered, hired])
 *   6. 面接 (interview, offered, hired)
 *   7. 内定 (offered, hired)
 *   8. 採用 (hired)
 *
 * 期間は from/to で絞り込む。各テーブルは別カラム名なので個別にクエリする。
 */

import { prisma } from "@/lib/db"

export type FunnelStage = {
  key: string
  label: string
  count: number
  // 直前ステージからの変換率 (0-1)。最初のステージは null。
  conversionFromPrev: number | null
}

export type FunnelData = {
  range: { from: Date; to: Date; label: string }
  stages: FunnelStage[]
  hiredCount: number
  overallConversion: number | null // hired / view
}

export type RangeKey = "30d" | "90d" | "all"

const RANGE_LABEL: Record<RangeKey, string> = {
  "30d": "直近 30 日間",
  "90d": "直近 90 日間",
  all: "全期間",
}

function rangeFrom(key: RangeKey): Date {
  if (key === "30d") return new Date(Date.now() - 30 * 86_400_000)
  if (key === "90d") return new Date(Date.now() - 90 * 86_400_000)
  return new Date(0)
}

export async function computeCompanyFunnel(
  companyId: string,
  rangeKey: RangeKey
): Promise<FunnelData> {
  const from = rangeFrom(rangeKey)
  const to = new Date()

  // 集計対象の job 一覧（求人 id を where に使い回す）
  const jobIds = await prisma.job
    .findMany({ where: { companyId }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id))
    .catch(() => [] as string[])

  if (jobIds.length === 0) {
    return {
      range: { from, to, label: RANGE_LABEL[rangeKey] },
      stages: [
        { key: "view", label: "求人閲覧", count: 0, conversionFromPrev: null },
        { key: "click", label: "応募クリック", count: 0, conversionFromPrev: null },
        { key: "lead", label: "リード捕捉", count: 0, conversionFromPrev: null },
        { key: "apply", label: "応募成立", count: 0, conversionFromPrev: null },
        { key: "screen", label: "選考中以降", count: 0, conversionFromPrev: null },
        { key: "interview", label: "面接以降", count: 0, conversionFromPrev: null },
        { key: "offer", label: "内定以降", count: 0, conversionFromPrev: null },
        { key: "hire", label: "採用", count: 0, conversionFromPrev: null },
      ],
      hiredCount: 0,
      overallConversion: null,
    }
  }

  const timeRange = rangeKey === "all" ? {} : { gte: from }

  const [
    viewCount,
    clickCount,
    leadCount,
    applyCount,
    screenCount,
    interviewCount,
    offerCount,
    hireCount,
  ] = await Promise.all([
    prisma.jobView
      .count({ where: { jobId: { in: jobIds }, viewedAt: timeRange } })
      .catch(() => 0),
    prisma.applicationClick
      .count({
        where: { jobId: { in: jobIds }, clickedAt: timeRange },
      })
      .catch(() => 0),
    prisma.lineLead
      .count({ where: { jobId: { in: jobIds }, createdAt: timeRange } })
      .catch(() => 0),
    prisma.application
      .count({ where: { companyId, createdAt: timeRange } })
      .catch(() => 0),
    prisma.application
      .count({
        where: {
          companyId,
          createdAt: timeRange,
          status: { in: ["reviewing", "interview", "offered", "hired"] },
        },
      })
      .catch(() => 0),
    prisma.application
      .count({
        where: {
          companyId,
          createdAt: timeRange,
          status: { in: ["interview", "offered", "hired"] },
        },
      })
      .catch(() => 0),
    prisma.application
      .count({
        where: {
          companyId,
          createdAt: timeRange,
          status: { in: ["offered", "hired"] },
        },
      })
      .catch(() => 0),
    prisma.application
      .count({ where: { companyId, createdAt: timeRange, status: "hired" } })
      .catch(() => 0),
  ])

  const counts = [
    viewCount,
    clickCount,
    leadCount,
    applyCount,
    screenCount,
    interviewCount,
    offerCount,
    hireCount,
  ]
  const labels = [
    "求人閲覧",
    "応募クリック",
    "リード捕捉",
    "応募成立",
    "選考中以降",
    "面接以降",
    "内定以降",
    "採用",
  ]
  const keys = [
    "view",
    "click",
    "lead",
    "apply",
    "screen",
    "interview",
    "offer",
    "hire",
  ]

  const stages: FunnelStage[] = counts.map((count, i) => {
    const prev = i === 0 ? null : counts[i - 1]
    const conv = prev !== null && prev > 0 ? count / prev : null
    return {
      key: keys[i],
      label: labels[i],
      count,
      conversionFromPrev: conv,
    }
  })

  return {
    range: { from, to, label: RANGE_LABEL[rangeKey] },
    stages,
    hiredCount: hireCount,
    overallConversion: viewCount > 0 ? hireCount / viewCount : null,
  }
}

export function isRangeKey(value: unknown): value is RangeKey {
  return value === "30d" || value === "90d" || value === "all"
}

// ============================================================================
// 求人別パフォーマンス（ジョブ単位の閲覧 → 応募 → 採用変換）
// ============================================================================

export type JobPerformanceRow = {
  jobId: string
  title: string
  status: string
  views: number
  applications: number
  hired: number
  // applications / views (0-1)、view 0 なら null
  viewToApply: number | null
}

export async function computeJobPerformance(
  companyId: string,
  rangeKey: RangeKey,
  limit = 20
): Promise<JobPerformanceRow[]> {
  const from = rangeFrom(rangeKey)
  const timeRange = rangeKey === "all" ? {} : { gte: from }

  // 企業の求人を直近作成順で limit 件
  const jobs = await prisma.job
    .findMany({
      where: { companyId },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "desc" },
      take: limit,
    })
    .catch(() => [] as { id: string; title: string; status: string }[])

  if (jobs.length === 0) return []

  const jobIds = jobs.map((j) => j.id)

  const [viewGroups, applyGroups, hireGroups] = await Promise.all([
    prisma.jobView
      .groupBy({
        by: ["jobId"],
        where: { jobId: { in: jobIds }, viewedAt: timeRange },
        _count: { _all: true },
      })
      .catch(
        () => [] as Array<{ jobId: string; _count: { _all: number } }>
      ),
    prisma.application
      .groupBy({
        by: ["jobId"],
        where: { jobId: { in: jobIds }, createdAt: timeRange },
        _count: { _all: true },
      })
      .catch(
        () => [] as Array<{ jobId: string; _count: { _all: number } }>
      ),
    prisma.application
      .groupBy({
        by: ["jobId"],
        where: {
          jobId: { in: jobIds },
          createdAt: timeRange,
          status: "hired",
        },
        _count: { _all: true },
      })
      .catch(
        () => [] as Array<{ jobId: string; _count: { _all: number } }>
      ),
  ])

  const viewMap = new Map(viewGroups.map((g) => [g.jobId, g._count._all]))
  const applyMap = new Map(applyGroups.map((g) => [g.jobId, g._count._all]))
  const hireMap = new Map(hireGroups.map((g) => [g.jobId, g._count._all]))

  return jobs.map((j) => {
    const views = viewMap.get(j.id) ?? 0
    const applications = applyMap.get(j.id) ?? 0
    const hired = hireMap.get(j.id) ?? 0
    return {
      jobId: j.id,
      title: j.title,
      status: j.status,
      views,
      applications,
      hired,
      viewToApply: views > 0 ? applications / views : null,
    }
  })
}

// ============================================================================
// 時系列（日別 / 週別の応募・採用件数）
// ============================================================================

export type TimeSeriesPoint = {
  date: string // YYYY-MM-DD
  views: number
  applications: number
  hired: number
}

/**
 * 期間を日次バケットに分割して件数を集計。
 * 30d / 90d は日次、all は週次にする。
 */
export async function computeTimeSeries(
  companyId: string,
  rangeKey: RangeKey
): Promise<TimeSeriesPoint[]> {
  const from = rangeKey === "all"
    ? new Date(Date.now() - 365 * 86_400_000)
    : rangeFrom(rangeKey)
  const to = new Date()
  const bucketDays = rangeKey === "all" ? 7 : 1

  const jobIds = await prisma.job
    .findMany({ where: { companyId }, select: { id: true } })
    .then((rows) => rows.map((r) => r.id))
    .catch(() => [] as string[])

  if (jobIds.length === 0) return []

  // applications / hires は createdAt ベース、views は viewedAt
  const [views, applications, hires] = await Promise.all([
    prisma.jobView
      .findMany({
        where: { jobId: { in: jobIds }, viewedAt: { gte: from } },
        select: { viewedAt: true },
      })
      .catch(() => [] as { viewedAt: Date }[]),
    prisma.application
      .findMany({
        where: { companyId, createdAt: { gte: from } },
        select: { createdAt: true, status: true },
      })
      .catch(() => [] as { createdAt: Date; status: string }[]),
    prisma.application
      .findMany({
        where: { companyId, createdAt: { gte: from }, status: "hired" },
        select: { updatedAt: true },
      })
      .catch(() => [] as { updatedAt: Date }[]),
  ])

  // バケット作成
  const buckets = new Map<string, TimeSeriesPoint>()
  const fromMs = from.getTime()
  const toMs = to.getTime()
  const bucketMs = bucketDays * 86_400_000
  for (let t = fromMs; t <= toMs; t += bucketMs) {
    const d = new Date(t)
    const key = d.toISOString().slice(0, 10)
    buckets.set(key, { date: key, views: 0, applications: 0, hired: 0 })
  }

  function bucketKey(d: Date): string {
    const diff = d.getTime() - fromMs
    if (diff < 0) return ""
    const bucketIdx = Math.floor(diff / bucketMs)
    const bucketStart = new Date(fromMs + bucketIdx * bucketMs)
    return bucketStart.toISOString().slice(0, 10)
  }

  for (const v of views) {
    const k = bucketKey(v.viewedAt)
    const b = buckets.get(k)
    if (b) b.views++
  }
  for (const a of applications) {
    const k = bucketKey(a.createdAt)
    const b = buckets.get(k)
    if (b) b.applications++
  }
  for (const h of hires) {
    const k = bucketKey(h.updatedAt)
    const b = buckets.get(k)
    if (b) b.hired++
  }

  return [...buckets.values()].sort((a, b) =>
    a.date.localeCompare(b.date)
  )
}

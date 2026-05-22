/**
 * /admin/analytics で使う集計クエリ群。
 * すべて admin 専用、ページ側で auth を通した上で呼ぶ前提。
 *
 * 期間範囲 (since 〜 now) を必ず受け取る。
 */

import { prisma } from "./db"
import { LEAD_STATUSES } from "./line-lead-status"

export interface PeriodRange {
  since: Date
  until: Date
}

export function rangeForDays(days: number): PeriodRange {
  const until = new Date()
  const since = new Date(until.getTime() - days * 24 * 60 * 60 * 1000)
  return { since, until }
}

// ============================================================
// ファネル: PV → 応募クリック → lead 化 → contacted → converted
// ============================================================

export interface FunnelStats {
  jobViews: number       // 期間内の JobView 件数
  uniqueViewSessions: number  // ユニーク sessionId 数（推定 UU）
  applyClicks: number    // ApplicationClick 件数
  leads: number          // LineLead 件数
  contacted: number      // status = contacted / qualified / converted の合計（対応開始済み）
  converted: number      // status = converted
}

export async function fetchFunnel({ since, until }: PeriodRange): Promise<FunnelStats> {
  const where = { gte: since, lte: until }

  const [jobViewsCount, uniqueViewRows, applyClicksCount, leadsCount, contactedCount, convertedCount] =
    await Promise.all([
      prisma.jobView.count({ where: { viewedAt: where } }).catch(() => 0),
      prisma.jobView
        .findMany({
          where: { viewedAt: where, sessionId: { not: null } },
          distinct: ["sessionId"],
          select: { sessionId: true },
        })
        .catch(() => []),
      prisma.applicationClick.count({ where: { clickedAt: where } }).catch(() => 0),
      prisma.lineLead.count({ where: { createdAt: where } }).catch(() => 0),
      prisma.lineLead
        .count({
          where: {
            createdAt: where,
            status: { in: ["contacted", "qualified", "converted"] },
          },
        })
        .catch(() => 0),
      prisma.lineLead
        .count({ where: { createdAt: where, status: "converted" } })
        .catch(() => 0),
    ])

  return {
    jobViews: jobViewsCount,
    uniqueViewSessions: uniqueViewRows.length,
    applyClicks: applyClicksCount,
    leads: leadsCount,
    contacted: contactedCount,
    converted: convertedCount,
  }
}

// ============================================================
// UTM source 別の lead 数
// ============================================================

export interface UtmBreakdown {
  source: string
  count: number
}

export async function fetchUtmBreakdown(
  { since, until }: PeriodRange,
  top = 10
): Promise<UtmBreakdown[]> {
  const rows = await prisma.lineLead
    .groupBy({
      by: ["utmSource"],
      where: { createdAt: { gte: since, lte: until } },
      _count: { _all: true },
      orderBy: { _count: { utmSource: "desc" } },
      take: top,
    })
    .catch(() => [] as Array<{ utmSource: string | null; _count: { _all: number } }>)

  return rows.map((r) => ({
    source: r.utmSource ?? "(direct/unknown)",
    count: r._count._all,
  }))
}

// ============================================================
// カテゴリ別 lead 数（応募求人ベース）
// ============================================================

export interface CategoryBreakdown {
  category: string
  count: number
}

export async function fetchCategoryBreakdown({
  since,
  until,
}: PeriodRange): Promise<CategoryBreakdown[]> {
  // 集計対象求人を取得した上でカテゴリ別カウント。
  // groupBy はリレーション越しにできないので raw approach。
  const leads = await prisma.lineLead
    .findMany({
      where: { createdAt: { gte: since, lte: until }, jobId: { not: null } },
      select: { job: { select: { category: true } } },
    })
    .catch(() => [] as Array<{ job: { category: string } | null }>)

  const counts = new Map<string, number>()
  for (const l of leads) {
    const cat = l.job?.category ?? "(none)"
    counts.set(cat, (counts.get(cat) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
}

// ============================================================
// 県別 lead 数（応募求人ベース）
// ============================================================

export interface PrefectureBreakdown {
  prefecture: string
  count: number
}

export async function fetchPrefectureBreakdown(
  { since, until }: PeriodRange,
  top = 12
): Promise<PrefectureBreakdown[]> {
  const leads = await prisma.lineLead
    .findMany({
      where: { createdAt: { gte: since, lte: until }, jobId: { not: null } },
      select: { job: { select: { prefecture: true } } },
    })
    .catch(() => [] as Array<{ job: { prefecture: string } | null }>)

  const counts = new Map<string, number>()
  for (const l of leads) {
    const p = l.job?.prefecture ?? "(unknown)"
    counts.set(p, (counts.get(p) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([prefecture, count]) => ({ prefecture, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, top)
}

// ============================================================
// 時系列: 日次の lead / view / click 数
// ============================================================

export interface TimeSeriesPoint {
  date: string  // YYYY-MM-DD
  leads: number
  applyClicks: number
  jobViews: number
}

export async function fetchTimeSeries({
  since,
  until,
}: PeriodRange): Promise<TimeSeriesPoint[]> {
  const [leads, clicks, views] = await Promise.all([
    prisma.lineLead
      .findMany({
        where: { createdAt: { gte: since, lte: until } },
        select: { createdAt: true },
      })
      .catch(() => [] as Array<{ createdAt: Date }>),
    prisma.applicationClick
      .findMany({
        where: { clickedAt: { gte: since, lte: until } },
        select: { clickedAt: true },
      })
      .catch(() => [] as Array<{ clickedAt: Date }>),
    prisma.jobView
      .findMany({
        where: { viewedAt: { gte: since, lte: until } },
        select: { viewedAt: true },
      })
      .catch(() => [] as Array<{ viewedAt: Date }>),
  ])

  const byDay = new Map<string, TimeSeriesPoint>()

  const days = Math.ceil((until.getTime() - since.getTime()) / (24 * 60 * 60 * 1000))
  for (let i = 0; i <= days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
    const key = ymd(d)
    byDay.set(key, { date: key, leads: 0, applyClicks: 0, jobViews: 0 })
  }

  for (const l of leads) {
    const k = ymd(l.createdAt)
    const p = byDay.get(k)
    if (p) p.leads++
  }
  for (const c of clicks) {
    const k = ymd(c.clickedAt)
    const p = byDay.get(k)
    if (p) p.applyClicks++
  }
  for (const v of views) {
    const k = ymd(v.viewedAt)
    const p = byDay.get(k)
    if (p) p.jobViews++
  }

  return Array.from(byDay.values()).sort((a, b) => (a.date < b.date ? -1 : 1))
}

function ymd(d: Date): string {
  // Asia/Tokyo 基準
  const tz = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  return tz.toISOString().slice(0, 10)
}

// ============================================================
// status 別の lead 数（contacted 比率の参考用）
// ============================================================

export async function fetchStatusCounts({
  since,
  until,
}: PeriodRange): Promise<Record<string, number>> {
  const rows = await prisma.lineLead
    .groupBy({
      by: ["status"],
      where: { createdAt: { gte: since, lte: until } },
      _count: { _all: true },
    })
    .catch(() => [] as Array<{ status: string; _count: { _all: number } }>)

  const out: Record<string, number> = {}
  for (const s of LEAD_STATUSES) out[s] = 0
  for (const r of rows) out[r.status] = r._count._all
  return out
}

/**
 * セグメント定義 + 解決ロジック。
 *
 * セグメント条件:
 *  - utmSource           : UTM source 完全一致
 *  - status              : lead ステータス
 *  - jobCategory         : 応募先 (lead.job) のカテゴリ
 *  - jobPrefecture       : 応募先の県
 *  - viewedCategory      : 同 sessionId で閲覧したことのある求人カテゴリ
 *  - viewedPrefecture    : 同 sessionId で閲覧したことのある求人県
 *  - lineBound           : LINE userId が bind 済みか
 *  - createdSince        : この日時以降に作成された lead
 *
 * すべて optional。複数指定すれば AND 結合。
 */

import { prisma } from "./db"
import { LEAD_STATUSES, type LeadStatus } from "./line-lead-status"
import type { Prisma } from "@prisma/client"

export interface Segment {
  utmSource?: string
  status?: LeadStatus
  jobCategory?: string
  jobPrefecture?: string
  viewedCategory?: string
  viewedPrefecture?: string
  lineBound?: boolean
  createdSinceDays?: number // 過去 N 日以内
}

export function isLeadStatusValue(v: string): v is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(v)
}

interface LeadRowForBroadcast {
  id: string
  name: string
  phone: string
  email: string
  status: string
  lineUserId: string | null
  jobId: string | null
}

/**
 * セグメント条件を解決して該当 lead を返す。
 * lineBound オプションで bind 済 lead だけにフィルタ可能。
 */
export async function resolveSegment(
  segment: Segment,
  limit = 500
): Promise<LeadRowForBroadcast[]> {
  // 配信オプトアウト済みは常に除外（運用上の鉄則）
  const where: Prisma.LineLeadWhereInput = { optedOut: false }

  if (segment.utmSource) where.utmSource = segment.utmSource
  if (segment.status) where.status = segment.status
  if (segment.jobCategory) {
    where.job = { ...(where.job as object | undefined), is: { category: segment.jobCategory } }
  }
  if (segment.jobPrefecture) {
    where.job = {
      ...(where.job as object | undefined),
      is: {
        ...((where.job as { is?: object })?.is ?? {}),
        prefecture: segment.jobPrefecture,
      },
    }
  }
  if (segment.lineBound !== undefined) {
    where.lineUserId = segment.lineBound ? { not: null } : null
  }
  if (segment.createdSinceDays) {
    const since = new Date(Date.now() - segment.createdSinceDays * 24 * 60 * 60 * 1000)
    where.createdAt = { gte: since }
  }

  // 閲覧履歴ベースの絞り込みは sessionId 経由
  // 該当 sessionId のセットを引いておいて IN 句で絞る
  if (segment.viewedCategory || segment.viewedPrefecture) {
    const jobWhere: Prisma.JobWhereInput = { status: "active" }
    if (segment.viewedCategory) jobWhere.category = segment.viewedCategory
    if (segment.viewedPrefecture) jobWhere.prefecture = segment.viewedPrefecture
    const rows = await prisma.jobView
      .findMany({
        where: { job: jobWhere, sessionId: { not: null } },
        distinct: ["sessionId"],
        select: { sessionId: true },
        take: 5000,
      })
      .catch(() => [] as Array<{ sessionId: string | null }>)
    const sids = rows.map((r) => r.sessionId).filter((s): s is string => !!s)
    if (sids.length === 0) return []
    where.sessionId = { in: sids }
  }

  return prisma.lineLead
    .findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        status: true,
        lineUserId: true,
        jobId: true,
      },
    })
    .catch(() => [] as LeadRowForBroadcast[])
}

/** セグメント条件にマッチする lead 数を高速にカウント。 */
export async function countSegment(segment: Segment): Promise<{ total: number; bound: number }> {
  const rows = await resolveSegment(segment, 5000)
  return {
    total: rows.length,
    bound: rows.filter((r) => !!r.lineUserId).length,
  }
}

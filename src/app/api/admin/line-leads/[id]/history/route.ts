/**
 * GET /api/admin/line-leads/[id]/history
 *
 * 管理者向け: lead の閲覧 / クリック履歴 + 他の lead 履歴を取得する。
 * - viewedJobs: 同じ sessionId で見た求人（直近 50 件）
 * - clickedJobs: 同じ sessionId でクリックした応募ボタン（直近 50 件）
 * - otherLeads:  同じ phone / email を持つ他の lead レコード
 *
 * 当 lead 自体の sessionId が無ければ viewedJobs / clickedJobs は空配列。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params
  const lead = await prisma.lineLead
    .findUnique({
      where: { id },
      select: { id: true, sessionId: true, phone: true, email: true },
    })
    .catch(() => null)
  if (!lead) {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  // 並列に取得
  const [viewedJobs, clickedJobs, otherLeads] = await Promise.all([
    lead.sessionId
      ? prisma.jobView
          .findMany({
            where: { sessionId: lead.sessionId },
            orderBy: { viewedAt: "desc" },
            take: 50,
            select: {
              id: true,
              viewedAt: true,
              referer: true,
              utmSource: true,
              utmMedium: true,
              utmCampaign: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  prefecture: true,
                  city: true,
                  category: true,
                },
              },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
    lead.sessionId
      ? prisma.applicationClick
          .findMany({
            where: { sessionId: lead.sessionId },
            orderBy: { clickedAt: "desc" },
            take: 50,
            select: {
              id: true,
              clickedAt: true,
              source: true,
              job: {
                select: {
                  id: true,
                  title: true,
                  prefecture: true,
                  city: true,
                  category: true,
                },
              },
            },
          })
          .catch(() => [])
      : Promise.resolve([]),
    prisma.lineLead
      .findMany({
        where: {
          id: { not: lead.id },
          OR: [{ phone: lead.phone }, { email: lead.email }],
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          createdAt: true,
          status: true,
          name: true,
          job: { select: { id: true, title: true } },
        },
      })
      .catch(() => []),
  ])

  return Response.json({
    sessionId: lead.sessionId,
    viewedJobs: viewedJobs.map((v) => ({
      id: v.id,
      viewedAt: v.viewedAt.toISOString(),
      referer: v.referer,
      utm: {
        source: v.utmSource,
        medium: v.utmMedium,
        campaign: v.utmCampaign,
      },
      job: v.job,
    })),
    clickedJobs: clickedJobs.map((c) => ({
      id: c.id,
      clickedAt: c.clickedAt.toISOString(),
      source: c.source,
      job: c.job,
    })),
    otherLeads: otherLeads.map((l) => ({
      ...l,
      createdAt: l.createdAt.toISOString(),
    })),
  })
}

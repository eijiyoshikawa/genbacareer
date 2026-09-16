/**
 * 企業却下エンドポイント（管理者専用）
 *
 * POST /api/admin/companies/:id/reject
 * Body: { reason?: string }
 * - status を pending/approved → rejected に変更
 * - 却下時点で active な自社求人を closed にする
 *   (却下後も /jobs・各種フィード・sitemap は company.status を見ないため、
 *    ここで閉じておかないと却下済み企業の求人が掲載され続けてしまう)
 * - 担当メールへ却下通知メールを送信
 */
import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendCompanyRejectionEmail } from "@/lib/email"
import { logAudit, buildActorFromSession } from "@/lib/audit-log"

const schema = z.object({
  reason: z.string().max(500).optional(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params

  let body: unknown = {}
  try {
    body = await request.json()
  } catch {
    // body 省略可
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "入力内容に誤りがあります" }, { status: 400 })
  }

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true, contactEmail: true, status: true },
  })

  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  if (company.status === "rejected") {
    return Response.json(
      { error: "この企業はすでに却下されています" },
      { status: 400 }
    )
  }

  const reason = parsed.data.reason?.trim() || null

  await prisma.company.update({
    where: { id },
    data: {
      status: "rejected",
      rejectedAt: new Date(),
      rejectionReason: reason,
      approvedAt: null,
    },
  })

  const closedJobs = await prisma.job.updateMany({
    where: { companyId: id, status: "active" },
    data: { status: "closed" },
  })

  const actor = await buildActorFromSession()
  void logAudit({
    ...actor,
    resourceType: "company",
    resourceId: id,
    action: "reject",
    summary: `企業「${company.name}」を却下`,
    diff: {
      previousStatus: company.status,
      newStatus: "rejected",
      reason,
      closedJobs: closedJobs.count,
    },
  })

  if (company.contactEmail) {
    try {
      await sendCompanyRejectionEmail(company.contactEmail, company.name, reason)
    } catch (e) {
      console.error("[admin/companies/reject] email failed:", e)
    }
  }

  return Response.json({
    success: true,
    status: "rejected",
    closedJobs: closedJobs.count,
  })
}

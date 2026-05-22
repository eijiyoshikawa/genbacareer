/**
 * 企業承認エンドポイント（管理者専用）
 *
 * POST /api/admin/companies/:id/approve
 * - status を pending/rejected → approved に変更
 * - rejection 関連フィールドをクリア
 * - 担当メールへ承認完了の通知メールを送信
 */
import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendCompanyApprovalEmail } from "@/lib/email"
import { logAudit, buildActorFromSession } from "@/lib/audit-log"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true, contactEmail: true, status: true },
  })

  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  if (company.status === "approved") {
    return Response.json(
      { error: "この企業はすでに承認済みです" },
      { status: 400 }
    )
  }

  await prisma.company.update({
    where: { id },
    data: {
      status: "approved",
      approvedAt: new Date(),
      rejectedAt: null,
      rejectionReason: null,
    },
  })

  // 監査ログ
  const actor = await buildActorFromSession()
  void logAudit({
    ...actor,
    resourceType: "company",
    resourceId: id,
    action: "approve",
    summary: `企業「${company.name}」を承認`,
    diff: { previousStatus: company.status, newStatus: "approved" },
  })

  // メール失敗で承認自体を巻き戻さない（管理者は手動で再送できる）
  if (company.contactEmail) {
    try {
      await sendCompanyApprovalEmail(company.contactEmail, company.name)
    } catch (e) {
      console.error("[admin/companies/approve] email failed:", e)
    }
  }

  return Response.json({ success: true, status: "approved" })
}

/**
 * 企業の支払方法を切り替える（管理者専用）
 *
 * PATCH /api/admin/companies/:id/payment-method
 * Body: { paymentMethod: "moneyforward" }
 *
 * Stripe カード決済は廃止済み。現状は MoneyForward のみ受理する。
 * 将来別プロバイダを追加した際に enum を拡張する。
 */
import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAudit, buildActorFromSession } from "@/lib/audit-log"

const schema = z.object({
  paymentMethod: z.enum(["moneyforward"]),
})

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "paymentMethod は moneyforward を指定してください" },
      { status: 400 }
    )
  }

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true },
  })
  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  await prisma.company.update({
    where: { id },
    data: { paymentMethod: parsed.data.paymentMethod },
  })

  void logAudit({
    ...(await buildActorFromSession()),
    resourceType: "company",
    resourceId: id,
    action: "payment_method_change",
    summary: `企業 ${id} の支払方法を ${parsed.data.paymentMethod} に変更`,
  })

  return Response.json({ success: true, paymentMethod: parsed.data.paymentMethod })
}

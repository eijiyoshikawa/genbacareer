/**
 * PATCH /api/admin/hiring-bonuses/[id]
 * 15.6 採用決定ボーナスの承認 / 支払済 / 却下。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const schema = z.object({
  action: z.enum(["approve", "mark_paid", "reject"]),
  rejectionReason: z.string().max(500).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "入力エラー" }, { status: 400 })
  }

  const bonus = await prisma.hiringBonus.findUnique({
    where: { id },
    select: { status: true },
  })
  if (!bonus) {
    return Response.json({ error: "ボーナス申請が見つかりません" }, { status: 404 })
  }

  // admin UI (actions.tsx) は現在のステータスに対応するボタンしか出さないが、
  // 別タブでの二重操作やリクエストの直接叩きで status を巻き戻せないよう、
  // ここでも遷移元ステータスを検証する (early-resignations と同じパターン)。
  const action = parsed.data.action
  if ((action === "approve" || action === "reject") && bonus.status !== "requested") {
    return Response.json(
      { error: `現在のステータス (${bonus.status}) からは${action === "approve" ? "承認" : "却下"}できません` },
      { status: 409 },
    )
  }
  if (action === "mark_paid" && bonus.status !== "approved") {
    return Response.json(
      { error: `現在のステータス (${bonus.status}) からは支払済にできません` },
      { status: 409 },
    )
  }

  const data: Record<string, unknown> = {}
  if (action === "approve") {
    data.status = "approved"
    data.approvedAt = new Date()
    data.approvedBy = session?.user?.id ?? null
  } else if (action === "mark_paid") {
    data.status = "paid"
    data.paidAt = new Date()
    data.paidBy = session?.user?.id ?? null
  } else {
    data.status = "rejected"
    data.rejectedAt = new Date()
    data.rejectionReason = parsed.data.rejectionReason ?? null
  }

  await prisma.hiringBonus.update({ where: { id }, data })
  return Response.json({ ok: true })
}

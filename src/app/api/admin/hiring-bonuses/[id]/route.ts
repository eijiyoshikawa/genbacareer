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

  const row = await prisma.hiringBonus.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!row) {
    return Response.json({ error: "申請が見つかりません" }, { status: 404 })
  }

  let fromStatus: string
  const data: Record<string, unknown> = {}
  if (parsed.data.action === "approve") {
    if (row.status !== "requested") {
      return Response.json(
        { error: `現在のステータス (${row.status}) からは承認できません` },
        { status: 409 }
      )
    }
    fromStatus = "requested"
    data.status = "approved"
    data.approvedAt = new Date()
    data.approvedBy = session?.user?.id ?? null
  } else if (parsed.data.action === "mark_paid") {
    if (row.status !== "approved") {
      return Response.json(
        { error: `現在のステータス (${row.status}) からは支払済にできません` },
        { status: 409 }
      )
    }
    fromStatus = "approved"
    data.status = "paid"
    data.paidAt = new Date()
    data.paidBy = session?.user?.id ?? null
  } else {
    if (row.status !== "requested") {
      return Response.json(
        { error: `現在のステータス (${row.status}) からは却下できません` },
        { status: 409 }
      )
    }
    fromStatus = "requested"
    data.status = "rejected"
    data.rejectedAt = new Date()
    data.rejectionReason = parsed.data.rejectionReason ?? null
  }

  // findUnique の status チェックと update の間の競合を防ぐため、
  // where に元ステータスのガードを含めて原子的に更新する。
  const { count } = await prisma.hiringBonus.updateMany({
    where: { id, status: fromStatus },
    data,
  })
  if (count === 0) {
    return Response.json(
      { error: "他の操作と競合しました。最新の状態を確認してください" },
      { status: 409 }
    )
  }
  return Response.json({ ok: true })
}

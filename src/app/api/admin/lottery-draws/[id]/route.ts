/**
 * PATCH /api/admin/lottery-draws/[id]
 * 当選景品の引き渡し状況を更新する（金券コード発行済等 → fulfilled）。認証: admin 必須。
 *
 * Body: { fulfillment: "pending" | "fulfilled" | "not_applicable" }
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const STATES = ["pending", "fulfilled", "not_applicable"]

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  const fulfillment = typeof body.fulfillment === "string" ? body.fulfillment : ""
  if (!STATES.includes(fulfillment)) {
    return Response.json({ error: "状態が不正です" }, { status: 400 })
  }

  try {
    const draw = await prisma.lotteryDraw.update({
      where: { id },
      data: {
        fulfillment,
        fulfilledAt: fulfillment === "fulfilled" ? new Date() : null,
      },
    })
    return Response.json({ ok: true, draw })
  } catch {
    return Response.json({ error: "Not Found" }, { status: 404 })
  }
}

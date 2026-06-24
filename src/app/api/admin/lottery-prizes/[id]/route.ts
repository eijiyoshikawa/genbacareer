/**
 * PATCH /api/admin/lottery-prizes/[id]
 * 抽選景品を更新する（active 切替・在庫・重み・景品額・名称等）。認証: admin 必須。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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

  const data: Record<string, unknown> = {}
  if (typeof body.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 100)
  if (typeof body.active === "boolean") data.active = body.active
  if (body.weight !== undefined) data.weight = Math.max(0, Math.floor(Number(body.weight)) || 0)
  if (body.valueJpy !== undefined) data.valueJpy = Math.max(0, Math.floor(Number(body.valueJpy)) || 0)
  if (body.sortOrder !== undefined) data.sortOrder = Math.floor(Number(body.sortOrder)) || 0
  if (body.stock !== undefined) {
    data.stock =
      body.stock === null || body.stock === "" ? null : Math.max(0, Math.floor(Number(body.stock)) || 0)
  }

  if (Object.keys(data).length === 0) {
    return Response.json({ error: "更新項目がありません" }, { status: 400 })
  }

  try {
    const prize = await prisma.lotteryPrize.update({ where: { id }, data })
    return Response.json({ ok: true, prize })
  } catch {
    return Response.json({ error: "Not Found" }, { status: 404 })
  }
}

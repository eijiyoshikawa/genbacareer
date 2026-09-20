/**
 * POST /api/admin/lottery-prizes
 * 抽選景品を新規作成する。認証: admin ロール必須。
 *
 * Body: { name, kind, valueJpy?, weight?, stock?(null=無制限), sortOrder? }
 *   kind: amazon_gift | service_perk | physical | none(ハズレ)
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

const KINDS = ["amazon_gift", "service_perk", "physical", "none"]

export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  const name = typeof body.name === "string" ? body.name.trim() : ""
  const kind = typeof body.kind === "string" ? body.kind : "service_perk"
  if (!name || name.length > 100 || !KINDS.includes(kind)) {
    return Response.json({ error: "入力内容が不正です" }, { status: 400 })
  }

  const valueJpy = Number.isFinite(Number(body.valueJpy)) ? Math.max(0, Math.floor(Number(body.valueJpy))) : 0
  const weight = Number.isFinite(Number(body.weight)) ? Math.max(0, Math.floor(Number(body.weight))) : 1
  const stock =
    body.stock === null || body.stock === undefined || body.stock === ""
      ? null
      : Math.max(0, Math.floor(Number(body.stock)))
  const sortOrder = Number.isFinite(Number(body.sortOrder)) ? Math.floor(Number(body.sortOrder)) : 0

  const prize = await prisma.lotteryPrize.create({
    data: { name, kind, valueJpy, weight, stock, sortOrder },
  })
  return Response.json({ ok: true, prize })
}

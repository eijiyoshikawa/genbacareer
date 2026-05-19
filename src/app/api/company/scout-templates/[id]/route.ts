/**
 * スカウトテンプレート個別操作 (update / delete)
 *
 * PUT    /api/company/scout-templates/[id]
 * DELETE /api/company/scout-templates/[id]
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const updateSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  body: z.string().min(1).max(5000).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
})

async function getCtx() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" as const, status: 401 }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) return { error: "Forbidden" as const, status: 403 }
  return { companyId }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCtx()
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  // 自社のみ更新可能
  const owned = await prisma.scoutTemplate.findFirst({
    where: { id, companyId: ctx.companyId },
    select: { id: true },
  })
  if (!owned) {
    return Response.json({ error: "Not Found" }, { status: 404 })
  }

  const template = await prisma.scoutTemplate.update({
    where: { id },
    data: parsed.data,
  })
  return Response.json({ ok: true, template })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCtx()
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })
  const { id } = await params

  const result = await prisma.scoutTemplate.deleteMany({
    where: { id, companyId: ctx.companyId },
  })
  if (result.count === 0) {
    return Response.json({ error: "Not Found" }, { status: 404 })
  }
  return Response.json({ ok: true })
}

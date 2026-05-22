/**
 * GET    /api/admin/job-templates/[id] — 1 件取得
 * PATCH                                  — 更新
 * DELETE                                 — 削除
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAudit, buildActorFromSession } from "@/lib/audit-log"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  category: z.string().min(1).max(50).optional(),
  description: z.string().min(1).optional(),
  requirements: z.string().nullable().optional(),
  benefits: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  hint: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
})

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  return role === "admin" ? session : null
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const { id } = await params
  const t = await prisma.jobTemplate.findUnique({ where: { id } }).catch(() => null)
  if (!t) return Response.json({ error: "not found" }, { status: 404 })
  return Response.json({ template: t })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  try {
    const updated = await prisma.jobTemplate.update({
      where: { id },
      data: parsed.data,
    })
    const actor = await buildActorFromSession()
    void logAudit({
      ...actor,
      resourceType: "job_template",
      resourceId: id,
      action: "update",
      summary: `テンプレ「${updated.name}」を更新`,
      diff: parsed.data,
    })
    return Response.json({ template: updated })
  } catch {
    return Response.json({ error: "not found" }, { status: 404 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const { id } = await params
  try {
    const before = await prisma.jobTemplate
      .findUnique({ where: { id }, select: { name: true, slug: true } })
      .catch(() => null)
    await prisma.jobTemplate.delete({ where: { id } })
    const actor = await buildActorFromSession()
    void logAudit({
      ...actor,
      resourceType: "job_template",
      resourceId: id,
      action: "delete",
      summary: `テンプレ「${before?.name ?? id}」を削除`,
      diff: before ?? undefined,
    })
    return Response.json({ ok: true })
  } catch {
    return Response.json({ error: "not found" }, { status: 404 })
  }
}

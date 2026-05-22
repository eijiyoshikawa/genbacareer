/**
 * PATCH /api/admin/line-leads/[id]
 *
 * 管理者専用: lead のステータス更新 + メモ追加 + オプトアウト切替。
 * Body: { status?: LeadStatus; notes?: string | null; optedOut?: boolean }
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { LEAD_STATUSES } from "@/lib/line-lead-status"

export const dynamic = "force-dynamic"

const bodySchema = z.object({
  status: z.enum(LEAD_STATUSES).optional(),
  notes: z.string().max(2000).nullable().optional(),
  optedOut: z.boolean().optional(),
})

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const { id } = await ctx.params

  let body: z.infer<typeof bodySchema>
  try {
    const json = await request.json().catch(() => ({}))
    body = bodySchema.parse(json)
  } catch (err) {
    return Response.json(
      { error: "invalid_body", issues: err instanceof z.ZodError ? err.issues : [] },
      { status: 400 }
    )
  }

  if (body.status === undefined && body.notes === undefined && body.optedOut === undefined) {
    return Response.json({ error: "no_changes" }, { status: 400 })
  }

  try {
    const optedOutFields =
      body.optedOut !== undefined
        ? {
            optedOut: body.optedOut,
            optedOutAt: body.optedOut ? new Date() : null,
            optedOutSource: body.optedOut ? "admin" : null,
          }
        : {}
    const updated = await prisma.lineLead.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.notes !== undefined && { notes: body.notes }),
        ...optedOutFields,
      },
      select: { id: true, status: true, notes: true, optedOut: true, updatedAt: true },
    })
    return Response.json({ success: true, lead: updated })
  } catch (e) {
    if (e instanceof Error && /Record to update not found/i.test(e.message)) {
      return Response.json({ error: "not_found" }, { status: 404 })
    }
    console.error(`[admin.line-leads.patch] ${e instanceof Error ? e.message : e}`)
    return Response.json({ error: "internal" }, { status: 500 })
  }
}

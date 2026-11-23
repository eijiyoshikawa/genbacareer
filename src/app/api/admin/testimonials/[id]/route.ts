/**
 * Admin: 体験談（利用者の声 / testimonials）の更新・削除。
 *
 * PATCH  /api/admin/testimonials/[id]
 *   Body: { quote?; who?; published?; sortOrder? }（部分更新）
 * DELETE /api/admin/testimonials/[id]
 */

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionUser = { id?: string; role?: string }

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const u = session.user as SessionUser
  if (u.role !== "admin") return null
  return { userId: u.id ?? null }
}

const patchSchema = z.object({
  quote: z.string().trim().min(1).max(2000).optional(),
  who: z.string().trim().min(1).max(120).optional(),
  published: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params

  let body: z.infer<typeof patchSchema>
  try {
    body = patchSchema.parse(await request.json())
  } catch (err) {
    return Response.json(
      {
        error: "invalid_body",
        issues: err instanceof z.ZodError ? err.issues : [],
      },
      { status: 400 }
    )
  }

  if (Object.keys(body).length === 0) {
    return Response.json({ error: "no_fields" }, { status: 400 })
  }

  try {
    await prisma.testimonial.update({ where: { id }, data: body })
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  return Response.json({ success: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 })

  const { id } = await params

  try {
    await prisma.testimonial.delete({ where: { id } })
  } catch {
    return Response.json({ error: "not_found" }, { status: 404 })
  }

  return Response.json({ success: true })
}

/**
 * Admin: 体験談（利用者の声 / testimonials）の作成。
 *
 * POST /api/admin/testimonials
 *   Body: { quote: string; who: string; published?: boolean; sortOrder?: number }
 *
 * TOP の VOICE セクションに published=true のものが sortOrder 昇順で表示される。
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

const createSchema = z.object({
  quote: z.string().trim().min(1, "本文を入力してください").max(2000),
  who: z.string().trim().min(1, "肩書き（誰の声か）を入力してください").max(120),
  published: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).max(9999).optional().default(0),
})

export async function POST(request: Request) {
  const admin = await requireAdmin()
  if (!admin) return Response.json({ error: "unauthorized" }, { status: 401 })

  let body: z.infer<typeof createSchema>
  try {
    body = createSchema.parse(await request.json())
  } catch (err) {
    return Response.json(
      {
        error: "invalid_body",
        issues: err instanceof z.ZodError ? err.issues : [],
      },
      { status: 400 }
    )
  }

  const created = await prisma.testimonial.create({
    data: {
      quote: body.quote,
      who: body.who,
      published: body.published,
      sortOrder: body.sortOrder,
    },
    select: { id: true },
  })

  return Response.json({ success: true, id: created.id })
}

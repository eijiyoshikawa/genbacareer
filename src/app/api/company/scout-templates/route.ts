/**
 * スカウトテンプレート CRUD (list / create)
 *
 * GET  /api/company/scout-templates → 自社の一覧
 * POST /api/company/scout-templates  → 新規作成
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1).max(80),
  body: z.string().min(1).max(5000),
})

async function getCompanyId() {
  const session = await auth()
  if (!session?.user) return { error: "Unauthorized" as const, status: 401 }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) return { error: "Forbidden" as const, status: 403 }
  return { companyId }
}

export async function GET() {
  const ctx = await getCompanyId()
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })

  const templates = await prisma.scoutTemplate.findMany({
    where: { companyId: ctx.companyId },
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  })
  return Response.json({ ok: true, templates })
}

export async function POST(request: Request) {
  const ctx = await getCompanyId()
  if ("error" in ctx) return Response.json({ error: ctx.error }, { status: ctx.status })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Bad Request", issues: parsed.error.issues }, { status: 400 })
  }

  const template = await prisma.scoutTemplate.create({
    data: {
      companyId: ctx.companyId,
      name: parsed.data.name,
      body: parsed.data.body,
    },
  })
  return Response.json({ ok: true, template })
}

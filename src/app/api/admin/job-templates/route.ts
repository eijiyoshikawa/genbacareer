/**
 * GET  /api/admin/job-templates — 一覧
 * POST                          — 新規作成
 *
 * 管理者 (role=admin) のみ呼び出し可。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { logAudit, buildActorFromSession } from "@/lib/audit-log"

export const dynamic = "force-dynamic"

const createSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(100)
    .regex(/^[a-z0-9-]+$/, "slug は半角英数字とハイフンのみ"),
  name: z.string().min(1).max(100),
  category: z.string().min(1).max(50),
  description: z.string().min(1),
  requirements: z.string().nullable().optional(),
  benefits: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  hint: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().default(100),
  isActive: z.boolean().default(true),
})

async function requireAdmin() {
  const session = await auth().catch(() => null)
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  return role === "admin" ? session : null
}

export async function GET() {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const items = await prisma.jobTemplate
    .findMany({
      orderBy: [
        { isActive: "desc" },
        { sortOrder: "asc" },
        { category: "asc" },
        { name: "asc" },
      ],
    })
    .catch(() => [])
  return Response.json({ items })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data
  try {
    const created = await prisma.jobTemplate.create({
      data: {
        slug: data.slug,
        name: data.name,
        category: data.category,
        description: data.description,
        requirements: data.requirements ?? null,
        benefits: data.benefits,
        tags: data.tags,
        salaryMin: data.salaryMin ?? null,
        salaryMax: data.salaryMax ?? null,
        hint: data.hint ?? null,
        sortOrder: data.sortOrder,
        isActive: data.isActive,
      },
    })
    const actor = await buildActorFromSession()
    void logAudit({
      ...actor,
      resourceType: "job_template",
      resourceId: created.id,
      action: "create",
      summary: `テンプレ「${created.name}」を作成`,
      diff: { slug: created.slug, category: created.category },
    })
    return Response.json({ template: created }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("Unique constraint")) {
      return Response.json(
        { error: "その slug は既に使われています" },
        { status: 409 }
      )
    }
    return Response.json({ error: "作成に失敗しました" }, { status: 500 })
  }
}

/**
 * POST /api/admin/job-templates/seed
 *
 * 静的データ src/lib/job-templates.ts の JOB_TEMPLATES を DB に取り込む
 * （初回セットアップ用）。既存 slug は skip（重複 import 安全）。
 *
 * 管理者のみ。
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { JOB_TEMPLATES } from "@/lib/job-templates"

export const dynamic = "force-dynamic"

export async function POST() {
  const session = await auth().catch(() => null)
  if (!session?.user) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "admin") {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  let inserted = 0
  let skipped = 0
  for (const [i, t] of JOB_TEMPLATES.entries()) {
    try {
      await prisma.jobTemplate.create({
        data: {
          slug: t.id,
          name: t.name,
          category: t.category,
          description: t.description,
          requirements: t.requirements ?? null,
          benefits: t.benefits,
          tags: t.tags,
          salaryMin: t.salaryMin ?? null,
          salaryMax: t.salaryMax ?? null,
          hint: t.hint ?? null,
          sortOrder: 10 + i * 10,
          isActive: true,
        },
      })
      inserted++
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes("Unique constraint")) {
        skipped++
      } else {
        console.warn(`[job-templates.seed] ${t.id} failed: ${msg}`)
      }
    }
  }

  return Response.json({ inserted, skipped, total: JOB_TEMPLATES.length })
}

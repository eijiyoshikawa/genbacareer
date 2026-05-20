/**
 * POST /api/admin/categorize/run-batch (7.1)
 *
 * 未分類の Job を batch (default 50 件) で取り、ルールベース分類して
 * JobCategoryClassification に upsert する。
 *
 * admin 専用。手動キック想定 (cron 自動化は別途)。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { guessCategory } from "@/lib/category-guess"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const bodySchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    body = {}
  }
  const { limit } = bodySchema.parse(body || {})

  // JobCategoryClassification がまだない Job を取得
  // (1:1 関係なので、relation でなく LEFT JOIN 相当を生クエリで)
  const unclassified = await prisma.$queryRawUnsafe<
    { id: string; title: string; description: string | null }[]
  >(
    `SELECT j.id, j.title, j.description
     FROM "jobs" j
     LEFT JOIN "job_category_classifications" c ON c."job_id" = j.id
     WHERE c."job_id" IS NULL
       AND j.status = 'active'
     LIMIT $1`,
    limit
  ).catch(() => [])

  let processed = 0
  let highConfidence = 0 // 信頼度 >= 0.5 のもの
  for (const job of unclassified) {
    const result = guessCategory({
      title: job.title,
      description: job.description,
    })
    try {
      await prisma.jobCategoryClassification.upsert({
        where: { jobId: job.id },
        create: {
          jobId: job.id,
          industry: "construction", // 建設業界特化のため固定
          occupation: result.category,
          confidence: result.confidence,
          classifiedBy: "rule",
        },
        update: {
          occupation: result.category,
          confidence: result.confidence,
          classifiedBy: "rule",
          classifiedAt: new Date(),
        },
      })
      processed++
      if (result.confidence >= 0.5) highConfidence++
    } catch {
      // 個別失敗は無視して継続
    }
  }

  return Response.json({
    processed,
    highConfidence,
    remaining: unclassified.length === limit ? "more" : 0,
  })
}

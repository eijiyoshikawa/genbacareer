/**
 * POST /api/company/jobs/suggest
 *
 * 求人投稿ウィザード用 AI 補助。
 * type=title         → タイトル候補 3 案
 * type=description  → 仕事内容ドラフト
 *
 * 認可: 承認済企業ユーザーのみ。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { requireCompanyAuth, isCompanyAuthError } from "@/lib/company-auth"
import {
  generateTitleSuggestions,
  generateDescriptionDraft,
  isAiSuggestConfigured,
} from "@/lib/ai-job-suggest"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 30

const baseSchema = z.object({
  category: z.string().min(1).max(50),
  prefecture: z.string().min(1).max(20),
  city: z.string().max(100).nullable().optional(),
  employmentType: z.string().max(20).nullable().optional(),
  salaryMin: z.number().int().min(0).nullable().optional(),
  salaryMax: z.number().int().min(0).nullable().optional(),
  benefits: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
})

const titleSchema = baseSchema.extend({ type: z.literal("title") })

const descSchema = baseSchema.extend({
  type: z.literal("description"),
  title: z.string().min(1).max(200),
})

const bodySchema = z.discriminatedUnion("type", [titleSchema, descSchema])

export async function POST(request: NextRequest) {
  const ctx = await requireCompanyAuth({ requireApproved: true })
  if (isCompanyAuthError(ctx)) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  if (!isAiSuggestConfigured()) {
    return Response.json(
      { error: "AI 提案は現在ご利用いただけません（API キー未設定）" },
      { status: 503 }
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data

  if (data.type === "title") {
    const titles = await generateTitleSuggestions(data)
    if (!titles) {
      return Response.json({ error: "提案を生成できませんでした" }, { status: 502 })
    }
    return Response.json({ titles })
  }

  const description = await generateDescriptionDraft(data)
  if (!description) {
    return Response.json({ error: "提案を生成できませんでした" }, { status: 502 })
  }
  return Response.json({ description })
}

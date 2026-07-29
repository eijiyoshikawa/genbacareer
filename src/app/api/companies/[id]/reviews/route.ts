/**
 * POST /api/companies/[id]/reviews — 企業口コミ投稿 (12.2)
 *
 * 未ログインでも投稿可 (匿名扱い)、1 IP / 24h 1 件まで rate-limit。
 * status=pending で保存し、admin モデレーション後に approved で公開される。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureSchema } from "@/lib/ensure-schema"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

const schema = z.object({
  employmentStatus: z.enum(["current", "former", "interview"]),
  rating: z.number().int().min(1).max(5),
  ratingSalary: z.number().int().min(1).max(5).optional(),
  ratingWorkLife: z.number().int().min(1).max(5).optional(),
  ratingGrowth: z.number().int().min(1).max(5).optional(),
  ratingBenefits: z.number().int().min(1).max(5).optional(),
  title: z.string().max(200).optional(),
  goodPoints: z.string().max(2000).optional(),
  badPoints: z.string().max(2000).optional(),
  advice: z.string().max(2000).optional(),
  displayName: z.string().max(50).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(request)
  const rl = checkRateLimit({
    key: `review:${ip}`,
    limit: 1,
    windowMs: 24 * 60 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  const { id: companyId } = await params
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
    return Response.json({ error: "企業 ID が不正です" }, { status: 400 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力エラー", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const company = await prisma.company
    .findUnique({ where: { id: companyId }, select: { id: true } })
    .catch(() => null)
  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  const session = await auth().catch(() => null)

  // company_reviews は API 専用ルートからのみ書き込まれ、layout.tsx の
  // fire-and-forget self-heal を経由しないことがあるため明示的に待つ。
  await ensureSchema()

  await prisma.companyReview.create({
    data: {
      companyId,
      userId: session?.user?.id ?? null,
      employmentStatus: parsed.data.employmentStatus,
      rating: parsed.data.rating,
      ratingSalary: parsed.data.ratingSalary ?? null,
      ratingWorkLife: parsed.data.ratingWorkLife ?? null,
      ratingGrowth: parsed.data.ratingGrowth ?? null,
      ratingBenefits: parsed.data.ratingBenefits ?? null,
      title: parsed.data.title ?? null,
      goodPoints: parsed.data.goodPoints ?? null,
      badPoints: parsed.data.badPoints ?? null,
      advice: parsed.data.advice ?? null,
      displayName: parsed.data.displayName ?? "建設業界の方",
      reporterIp: ip,
    },
  })

  return Response.json({ ok: true, status: "pending" }, { status: 201 })
}

/**
 * PATCH /api/admin/company-reviews/[id]
 * 12.2 企業口コミの公開/却下を admin が判定。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const schema = z.object({
  status: z.enum(["approved", "rejected"]),
  moderationNote: z.string().max(500).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "入力エラー" }, { status: 400 })
  }

  try {
    await prisma.companyReview.update({
      where: { id },
      data: {
        status: parsed.data.status,
        moderationNote: parsed.data.moderationNote ?? null,
        moderatedAt: new Date(),
        moderatedBy: session?.user?.id ?? null,
      },
    })
  } catch {
    // 存在しない id (二重クリック等) は 404 として返す。他の admin ルートと
    // 揃え、Prisma の P2025 が素の 500 として返るのを防ぐ。
    return Response.json({ error: "口コミが見つかりません" }, { status: 404 })
  }
  return Response.json({ ok: true })
}

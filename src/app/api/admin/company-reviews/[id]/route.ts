/**
 * PATCH /api/admin/company-reviews/[id]
 * 12.2 企業口コミの公開/却下を admin が判定。
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isValidUuid } from "@/lib/uuid"

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

  // 環境変数ベースの管理者ログイン (id: "admin" 固定) は UUID でないため、
  // そのまま moderatedBy (@db.Uuid) に渡すと P2023 になる。
  const rawUserId = session?.user?.id
  await prisma.companyReview.update({
    where: { id },
    data: {
      status: parsed.data.status,
      moderationNote: parsed.data.moderationNote ?? null,
      moderatedAt: new Date(),
      moderatedBy: isValidUuid(rawUserId) ? rawUserId : null,
    },
  })
  return Response.json({ ok: true })
}

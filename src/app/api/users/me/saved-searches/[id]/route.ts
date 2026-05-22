/**
 * PATCH /api/users/me/saved-searches/[id] — 保存検索を更新
 * DELETE                                   — 削除
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  alertEnabled: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
  excludeKeywords: z.array(z.string().min(1).max(50)).max(20).optional(),
})

async function requireOwner(id: string) {
  const session = await auth()
  if (!session?.user?.id) {
    return { error: "ログインが必要です", status: 401 as const }
  }
  const item = await prisma.savedSearch
    .findUnique({ where: { id }, select: { userId: true } })
    .catch(() => null)
  if (!item || item.userId !== session.user.id) {
    return { error: "保存検索が見つかりません", status: 404 as const }
  }
  return { userId: session.user.id }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireOwner(id)
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
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
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const updated = await prisma.savedSearch.update({
    where: { id },
    data: parsed.data,
  })
  return Response.json({ savedSearch: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const ctx = await requireOwner(id)
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  await prisma.savedSearch.delete({ where: { id } })
  return Response.json({ ok: true })
}

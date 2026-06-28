/**
 * PATCH  /api/admin/blocklists/[id] - 有効/無効トグル・メモ更新
 * DELETE                              - 削除
 */

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const patchSchema = z.object({
  enabled: z.boolean().optional(),
  note: z.string().max(500).nullable().optional(),
})

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === "admin" ? session : null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "入力エラー" }, { status: 400 })
  }

  await prisma.blocklist.update({
    where: { id },
    data: {
      ...(parsed.data.enabled !== undefined ? { enabled: parsed.data.enabled } : {}),
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    },
  })
  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await requireAdmin())) {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }
  const { id } = await params
  await prisma.blocklist.delete({ where: { id } })
  return Response.json({ ok: true })
}

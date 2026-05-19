/**
 * POST /api/admin/jobs/[id]/close
 *
 * 管理者が「不適切」とフラグした求人を status="closed" に変更する。
 * 認証: admin ロールのセッション必須。
 *
 * Body (optional):
 *   { reason?: string } - 監査ログに残す任意の理由
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  if (!id) {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  try {
    const job = await prisma.job.update({
      where: { id },
      data: { status: "closed" },
      select: { id: true, status: true },
    })
    return Response.json({ ok: true, job })
  } catch (e) {
    console.error(`[admin/jobs/close] failed for ${id}:`, e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    )
  }
}

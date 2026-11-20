/**
 * POST /api/admin/jobs/[id]/close
 *
 * 管理者が「不適切」とフラグした求人を status="closed" に変更する。
 * 認証: admin ロールのセッション必須。
 *
 * Body (optional):
 *   { reason?: string } - 監査ログに残す任意の理由
 */

import { logAudit } from "@/lib/audit-log"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { revalidateAfterJobChange } from "@/lib/revalidate-public"

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
      select: { id: true, status: true, companyId: true },
    })
    // HelloWork 取り込みはこの記録を見て、掲載終了にした求人を再公開しない
    // (import-batch.ts Step 1.6)。action 名を変える場合は両方を揃えること。
    await logAudit({
      actorType: "admin",
      actorId: (session.user as { id?: string }).id ?? null,
      actorEmail: session.user.email ?? null,
      resourceType: "job",
      resourceId: job.id,
      action: "admin_close",
      summary: "求人を掲載終了 (管理者)",
    })
    revalidateAfterJobChange({ companyId: job.companyId })
    return Response.json({ ok: true, job })
  } catch (e) {
    console.error(`[admin/jobs/close] failed for ${id}:`, e)
    return Response.json(
      { error: e instanceof Error ? e.message : "Update failed" },
      { status: 500 }
    )
  }
}

/**
 * Admin: 戻入申請の承認 / 却下。
 *
 * PATCH /api/admin/early-resignations/[id]
 *   Body:
 *     { action: "approve", adminNote?: string }
 *     { action: "reject",  adminNote: string }   // 却下は理由必須
 *     { action: "mark_invoiced", mfCreditNoteId?: string }
 *
 * 副作用:
 *   - approve: status='approved', approvedBy/approvedAt 記録
 *   - reject:  status='rejected', rejectedBy/rejectedAt 記録
 *   - mark_invoiced: status='invoiced', mfCreditNoteId/invoicedAt 記録
 *     (実 MoneyForward 連携は別途。今は admin 手動マーク運用)
 */

import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { isValidUuid } from "@/lib/uuid"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionUser = { id?: string; role?: string }

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const u = session.user as SessionUser
  if (u.role !== "admin") return null
  // 環境変数ベースの管理者ログイン (id: "admin" 固定) は UUID でないため、
  // そのまま approvedBy/rejectedBy (@db.Uuid) に渡すと P2023 になる。
  return { userId: isValidUuid(u.id) ? u.id : null }
}

const patchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    adminNote: z.string().max(2000).optional(),
  }),
  z.object({
    action: z.literal("reject"),
    adminNote: z.string().min(1).max(2000),
  }),
  z.object({
    action: z.literal("mark_invoiced"),
    mfCreditNoteId: z.string().max(100).optional(),
  }),
])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireAdmin()
  if (!me) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id } = await params

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return Response.json({ error: "JSON が不正です" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return Response.json({ error: "入力エラー" }, { status: 400 })
  }

  const row = await prisma.earlyResignation.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!row) {
    return Response.json({ error: "申請が見つかりません" }, { status: 404 })
  }

  const now = new Date()

  switch (parsed.data.action) {
    case "approve": {
      if (row.status !== "reported") {
        return Response.json(
          { error: `現在のステータス (${row.status}) からは承認できません` },
          { status: 409 },
        )
      }
      await prisma.earlyResignation.update({
        where: { id },
        data: {
          status: "approved",
          adminNote: parsed.data.adminNote ?? null,
          approvedBy: me.userId,
          approvedAt: now,
        },
      })
      return Response.json({ ok: true })
    }
    case "reject": {
      if (row.status !== "reported") {
        return Response.json(
          { error: `現在のステータス (${row.status}) からは却下できません` },
          { status: 409 },
        )
      }
      await prisma.earlyResignation.update({
        where: { id },
        data: {
          status: "rejected",
          adminNote: parsed.data.adminNote,
          rejectedBy: me.userId,
          rejectedAt: now,
        },
      })
      return Response.json({ ok: true })
    }
    case "mark_invoiced": {
      if (row.status !== "approved") {
        return Response.json(
          { error: "承認済の申請のみ請求書発行マークできます" },
          { status: 409 },
        )
      }
      await prisma.earlyResignation.update({
        where: { id },
        data: {
          status: "invoiced",
          mfCreditNoteId: parsed.data.mfCreditNoteId ?? null,
          invoicedAt: now,
        },
      })
      return Response.json({ ok: true })
    }
  }
}

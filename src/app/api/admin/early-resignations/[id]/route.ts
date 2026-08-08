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

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionUser = { id?: string; role?: string }

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const u = session.user as SessionUser
  if (u.role !== "admin") return null
  return { userId: u.id ?? null }
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
      // findUnique の status チェックと update の間に別リクエストが割り込むと
      // 二重承認/承認後の却下のような不整合な状態遷移が起こり得るため、
      // where に status ガードを含めて原子的に更新する。
      const { count } = await prisma.earlyResignation.updateMany({
        where: { id, status: "reported" },
        data: {
          status: "approved",
          adminNote: parsed.data.adminNote ?? null,
          approvedBy: me.userId,
          approvedAt: now,
        },
      })
      if (count === 0) {
        return Response.json(
          { error: "他の操作と競合しました。最新の状態を確認してください" },
          { status: 409 },
        )
      }
      return Response.json({ ok: true })
    }
    case "reject": {
      if (row.status !== "reported") {
        return Response.json(
          { error: `現在のステータス (${row.status}) からは却下できません` },
          { status: 409 },
        )
      }
      const { count } = await prisma.earlyResignation.updateMany({
        where: { id, status: "reported" },
        data: {
          status: "rejected",
          adminNote: parsed.data.adminNote,
          rejectedBy: me.userId,
          rejectedAt: now,
        },
      })
      if (count === 0) {
        return Response.json(
          { error: "他の操作と競合しました。最新の状態を確認してください" },
          { status: 409 },
        )
      }
      return Response.json({ ok: true })
    }
    case "mark_invoiced": {
      if (row.status !== "approved") {
        return Response.json(
          { error: "承認済の申請のみ請求書発行マークできます" },
          { status: 409 },
        )
      }
      const { count } = await prisma.earlyResignation.updateMany({
        where: { id, status: "approved" },
        data: {
          status: "invoiced",
          mfCreditNoteId: parsed.data.mfCreditNoteId ?? null,
          invoicedAt: now,
        },
      })
      if (count === 0) {
        return Response.json(
          { error: "他の操作と競合しました。最新の状態を確認してください" },
          { status: 409 },
        )
      }
      return Response.json({ ok: true })
    }
  }
}

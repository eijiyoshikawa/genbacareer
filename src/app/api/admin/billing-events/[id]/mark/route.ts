/**
 * Admin: BillingEvent のステータスを手動更新する。
 *
 * POST /api/admin/billing-events/[id]/mark
 *   Body:
 *     { action: "mark_invoiced", mfBillingId?: string, invoiceUrl?: string }
 *     { action: "mark_paid" }
 *     { action: "mark_failed", reason?: string }
 *
 * 用途: MoneyForward 自動連携は未導入のため、admin が手動で
 *   - 請求書発行 (pending → invoiced) + MF 側 ID を保存
 *   - 入金確認 (invoiced → paid)
 *   - 失敗マーク (* → failed)
 * を打ち込んで運用する。
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
    action: z.literal("mark_invoiced"),
    mfBillingId: z.string().max(100).optional(),
    invoiceUrl: z.string().url().max(500).optional(),
  }),
  z.object({
    action: z.literal("mark_paid"),
  }),
  z.object({
    action: z.literal("mark_failed"),
  }),
])

export async function POST(
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

  const row = await prisma.billingEvent.findUnique({
    where: { id },
    select: { id: true, status: true },
  })
  if (!row) {
    return Response.json({ error: "対象が見つかりません" }, { status: 404 })
  }

  switch (parsed.data.action) {
    case "mark_invoiced": {
      // pending からの正常遷移に加え、failed からも遷移可能にする。
      // MF 側では請求書発行に成功したが、直後の DB 書き込みが失敗して
      // failed のまま残るケースがあるため（実際には請求書が存在するのに
      // アプリ側では追跡できない状態を admin が手動で復旧する）。
      if (row.status !== "pending" && row.status !== "failed") {
        return Response.json(
          { error: `現在のステータス (${row.status}) からは請求書発行マークできません` },
          { status: 409 },
        )
      }
      await prisma.billingEvent.update({
        where: { id },
        data: {
          status: "invoiced",
          mfBillingId: parsed.data.mfBillingId ?? null,
          invoiceUrl: parsed.data.invoiceUrl ?? null,
        },
      })
      return Response.json({ ok: true })
    }
    case "mark_paid": {
      if (row.status !== "invoiced") {
        return Response.json(
          { error: `現在のステータス (${row.status}) からは入金確認マークできません` },
          { status: 409 },
        )
      }
      await prisma.billingEvent.update({
        where: { id },
        data: { status: "paid" },
      })
      return Response.json({ ok: true })
    }
    case "mark_failed": {
      await prisma.billingEvent.update({
        where: { id },
        data: { status: "failed" },
      })
      return Response.json({ ok: true })
    }
  }
}

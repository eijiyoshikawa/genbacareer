/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: number }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * where: companyId フィルタで自動除外される。
 *
 * ステータス遷移は単体更新 (`/api/company/applications/[id]`) と同じ
 * VALID_STATUS_TRANSITIONS で検証する。遷移不可なもの (例: hired/rejected
 * からの巻き戻し、applied から一気に hired 等) は対象から除外し、
 * updated/skipped の件数として返す。
 *
 * hired への遷移は hiredAt の記録と成果報酬請求書の発行を伴うため、
 * 単体更新と同じ副作用を 1 件ずつ適用する (updateMany では表現できない)。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { canTransitionStatus } from "@/lib/application-status"

const ALLOWED_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(ALLOWED_STATUSES),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
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
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { ids, status: newStatus } = parsed.data

  const targets = await prisma.application.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true, status: true, hiredAt: true },
  })

  const validIds = targets
    .filter((a) => canTransitionStatus(a.status, newStatus))
    .map((a) => a.id)
  const skipped = ids.length - validIds.length

  if (validIds.length === 0) {
    return Response.json({ ok: true, updated: 0, skipped })
  }

  if (newStatus !== "hired") {
    const result = await prisma.application.updateMany({
      where: { id: { in: validIds }, companyId },
      data: { status: newStatus },
    })
    return Response.json({ ok: true, updated: result.count, skipped })
  }

  // hired は hiredAt 記録 + 成果報酬請求書発行を伴うため 1 件ずつ処理する。
  const { createHiringInvoice } = await import("@/lib/billing")
  const hiredAtById = new Map(targets.map((a) => [a.id, a.hiredAt]))
  let updated = 0
  for (const id of validIds) {
    await prisma.application.update({
      where: { id },
      data: {
        status: "hired",
        ...(hiredAtById.get(id) ? {} : { hiredAt: new Date() }),
      },
    })
    updated += 1

    try {
      const existingBilling = await prisma.billingEvent.findFirst({
        where: { applicationId: id, eventType: "hired" },
      })
      if (!existingBilling) {
        await createHiringInvoice(id)
      }
    } catch (error) {
      console.error(`[billing] Failed to create invoice for application ${id}:`, error)
    }
  }

  return Response.json({ ok: true, updated, skipped })
}

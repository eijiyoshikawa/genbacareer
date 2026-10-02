/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: number }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * findMany の where: companyId フィルタで自動除外される。
 *
 * 単体更新 (/api/company/applications/[id]) と同じ状態遷移ルール・採用時の
 * 自動請求 (createHiringInvoice) を適用する。不正な遷移 (例: applied → hired
 * の一発変更) はスキップし、他の対象だけ更新する。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { VALID_STATUS_TRANSITIONS } from "@/lib/application-status"

const ALLOWED_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
}

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
  const actorId = (session.user as { id?: string }).id ?? "unknown"

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

  const applications = await prisma.application.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true, status: true, statusHistory: true, hiredAt: true },
  })

  let updated = 0
  let skipped = 0

  for (const application of applications) {
    const allowed = VALID_STATUS_TRANSITIONS[application.status]
    if (!allowed || !allowed.includes(newStatus)) {
      skipped++
      continue
    }

    const history = Array.isArray(application.statusHistory)
      ? (application.statusHistory as unknown as StatusHistoryEntry[])
      : []
    const entry: StatusHistoryEntry = {
      from: application.status,
      to: newStatus,
      at: new Date().toISOString(),
      by: actorId,
    }

    await prisma.application.update({
      where: { id: application.id },
      data: {
        status: newStatus,
        statusHistory: [...history, entry],
        // 採用確定時に hiredAt を打刻 (C3 戻入処理の経過月数計算の基準)
        ...(newStatus === "hired" && !application.hiredAt
          ? { hiredAt: new Date() }
          : {}),
      },
    })
    updated++

    // 採用確定時の自動請求 (単体更新と同じロジック)
    if (newStatus === "hired") {
      try {
        const existingBilling = await prisma.billingEvent.findFirst({
          where: { applicationId: application.id, eventType: "hired" },
        })
        if (!existingBilling) {
          const { createHiringInvoice } = await import("@/lib/billing")
          await createHiringInvoice(application.id)
        } else {
          console.info(
            `[billing] Skipped duplicate invoice for application ${application.id}`
          )
        }
      } catch (error) {
        console.error(
          `[billing] Failed to create invoice for application ${application.id}:`,
          error
        )
      }
    }
  }

  return Response.json({ ok: true, updated, skipped })
}

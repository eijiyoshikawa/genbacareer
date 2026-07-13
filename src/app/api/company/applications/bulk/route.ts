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
 * 単体更新 (/api/company/applications/[id] PUT) と同じ規則を適用する:
 *  - VALID_STATUS_TRANSITIONS に無い遷移はスキップ (無効な遷移や二重「採用」を防ぐ)
 *  - 「採用」への遷移時は hiredAt を打刻し、自動請求 (createHiringInvoice) を起票する
 *    （早期離職の戻入判定や成功報酬請求はこの hiredAt / BillingEvent が起点のため必須）
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"
import { parsePrefs } from "@/lib/notification-prefs"

const ALLOWED_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(ALLOWED_STATUSES),
})

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const actorUserId = (session.user as { id?: string }).id ?? "unknown"

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
    select: {
      id: true,
      userId: true,
      status: true,
      statusHistory: true,
      hiredAt: true,
      user: { select: { email: true, name: true, notificationPrefs: true } },
      job: { select: { title: true } },
      company: { select: { name: true } },
    },
  })

  let updated = 0
  let skipped = 0

  for (const application of applications) {
    const currentStatus = application.status
    const allowed = VALID_STATUS_TRANSITIONS[currentStatus]
    if (!allowed || !allowed.includes(newStatus)) {
      skipped += 1
      continue
    }

    const history = Array.isArray(application.statusHistory)
      ? (application.statusHistory as unknown as StatusHistoryEntry[])
      : []
    const entry: StatusHistoryEntry = {
      from: currentStatus,
      to: newStatus,
      at: new Date().toISOString(),
      by: actorUserId,
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
    updated += 1

    // 採用確定時の自動請求
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

    // マイページ inbox 通知（fire-and-forget）
    notifyApplicationStatusChange({
      userId: application.userId,
      applicationId: application.id,
      newStatus,
      jobTitle: application.job.title,
    }).catch((e) => {
      console.warn(`[notification] failed: ${e instanceof Error ? e.message : e}`)
    })

    // ステータス通知メール（fire-and-forget）。通知設定で OFF の場合は送らない。
    if (
      application.user.email &&
      parsePrefs(application.user.notificationPrefs).emailEnabled
    ) {
      sendApplicationStatusEmail({
        to: application.user.email,
        candidateName: application.user.name ?? null,
        companyName: application.company?.name ?? "—",
        jobTitle: application.job.title,
        newStatus,
      }).catch((e) => {
        console.warn(`[application-notify] failed: ${e instanceof Error ? e.message : e}`)
      })
    }
  }

  return Response.json({ ok: true, updated, skipped })
}

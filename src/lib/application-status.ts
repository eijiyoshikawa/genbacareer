/**
 * 応募ステータス変更の共通ロジック。
 *
 * 単体更新 (PUT /api/company/applications/[id]) と一括更新
 * (POST /api/company/applications/bulk) の両方から使う。
 * 遷移ルール・hiredAt 打刻・成果報酬請求・通知を一箇所に集約し、
 * どちらか一方だけが更新されて請求が漏れる事態を防ぐ。
 */

import { prisma } from "./db"
import { sendApplicationStatusEmail } from "./application-notifications"
import { notifyApplicationStatusChange } from "./notifications"

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
  note?: string
}

export type ApplyStatusResult =
  | { ok: true; application: { id: string; status: string } }
  | { ok: false; id: string; reason: "not_found" | "invalid_transition"; currentStatus?: string }

export async function applyApplicationStatusChange({
  applicationId,
  companyId,
  newStatus,
  note,
  actorUserId,
}: {
  applicationId: string
  companyId: string
  newStatus: string
  note?: string
  actorUserId: string
}): Promise<ApplyStatusResult> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      companyId: true,
      userId: true,
      status: true,
      statusHistory: true,
      hiredAt: true,
      user: { select: { email: true, name: true } },
      job: { select: { title: true } },
      company: { select: { name: true } },
    },
  })

  if (!application || application.companyId !== companyId) {
    return { ok: false, id: applicationId, reason: "not_found" }
  }

  const currentStatus = application.status
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes(newStatus)) {
    return { ok: false, id: applicationId, reason: "invalid_transition", currentStatus }
  }

  const history = Array.isArray(application.statusHistory)
    ? (application.statusHistory as unknown as StatusHistoryEntry[])
    : []
  const entry: StatusHistoryEntry = {
    from: currentStatus,
    to: newStatus,
    at: new Date().toISOString(),
    by: actorUserId,
    ...(note ? { note } : {}),
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: newStatus,
      statusHistory: [...history, entry],
      // 採用確定時に hiredAt を打刻 (C3 戻入処理の経過月数計算の基準)
      ...(newStatus === "hired" && !application.hiredAt
        ? { hiredAt: new Date() }
        : {}),
    },
  })

  // 採用確定時の自動請求
  if (newStatus === "hired") {
    try {
      const existingBilling = await prisma.billingEvent.findFirst({
        where: { applicationId, eventType: "hired" },
      })
      if (!existingBilling) {
        const { createHiringInvoice } = await import("./billing")
        await createHiringInvoice(applicationId)
      } else {
        console.info(`[billing] Skipped duplicate invoice for application ${applicationId}`)
      }
    } catch (error) {
      console.error(`[billing] Failed to create invoice for application ${applicationId}:`, error)
    }
  }

  // マイページ inbox 通知（fire-and-forget）
  notifyApplicationStatusChange({
    userId: application.userId,
    applicationId,
    newStatus,
    jobTitle: application.job.title,
  }).catch((e) => {
    console.warn(`[notification] failed: ${e instanceof Error ? e.message : e}`)
  })

  // ステータス通知メール（fire-and-forget）
  if (application.user.email) {
    sendApplicationStatusEmail({
      to: application.user.email,
      candidateName: application.user.name ?? null,
      companyName: application.company?.name ?? "—",
      jobTitle: application.job.title,
      newStatus,
      note,
    }).catch((e) => {
      console.warn(`[application-notify] failed: ${e instanceof Error ? e.message : e}`)
    })
  }

  return { ok: true, application: updated }
}

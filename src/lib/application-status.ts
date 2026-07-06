/**
 * 応募ステータス変更の共通ロジック。
 *
 * 単体更新 (PUT /api/company/applications/[id]) と一括更新
 * (POST /api/company/applications/bulk) の両方から呼ばれる。
 * 状態遷移バリデーション・hiredAt 打刻・採用時の自動請求・通知を必ず一箇所で行う
 * ことで、更新経路によって請求や履歴が抜け落ちるのを防ぐ。
 */

import { prisma } from "@/lib/db"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"

export const APPLICATION_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
  "rejected",
] as const

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

export type ApplicationStatusUpdateResult =
  | { ok: true; applicationId: string }
  | { ok: false; applicationId: string; error: string }

/**
 * 1 件の応募ステータスを検証つきで更新する。
 * companyId が一致しない / 遷移が不正な場合は ok:false を返す（例外は投げない）。
 */
export async function updateApplicationStatus(args: {
  applicationId: string
  companyId: string
  newStatus: string
  by: string
  note?: string
}): Promise<ApplicationStatusUpdateResult> {
  const { applicationId: id, companyId, newStatus, by, note } = args

  const application = await prisma.application.findUnique({
    where: { id },
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
    return { ok: false, applicationId: id, error: "応募が見つかりません" }
  }

  const currentStatus = application.status
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes(newStatus)) {
    return {
      ok: false,
      applicationId: id,
      error: `「${currentStatus}」から「${newStatus}」への変更はできません`,
    }
  }

  const history = Array.isArray(application.statusHistory)
    ? (application.statusHistory as unknown as StatusHistoryEntry[])
    : []
  const entry: StatusHistoryEntry = {
    from: currentStatus,
    to: newStatus,
    at: new Date().toISOString(),
    by,
    ...(note ? { note } : {}),
  }

  await prisma.application.update({
    where: { id },
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
        where: { applicationId: id, eventType: "hired" },
      })
      if (!existingBilling) {
        const { createHiringInvoice } = await import("@/lib/billing")
        await createHiringInvoice(id)
      } else {
        console.info(`[billing] Skipped duplicate invoice for application ${id}`)
      }
    } catch (error) {
      console.error(`[billing] Failed to create invoice for application ${id}:`, error)
    }
  }

  // マイページ inbox 通知（fire-and-forget）
  notifyApplicationStatusChange({
    userId: application.userId,
    applicationId: id,
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

  return { ok: true, applicationId: id }
}

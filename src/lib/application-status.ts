/**
 * 応募ステータス変更の共通ロジック。
 *
 * 単一更新 (PUT /api/company/applications/[id]) と一括更新
 * (POST /api/company/applications/bulk) の両方から呼ばれる。
 * 採用確定時の hiredAt 打刻 / 自動請求 / 通知 / メール送信を
 * 一箇所に集約し、経路によって挙動が食い違わないようにする。
 */

import { prisma } from "@/lib/db"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"

export const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

export type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
  note?: string
}

export type ApplicationForStatusChange = {
  id: string
  userId: string
  status: string
  statusHistory: unknown
  hiredAt: Date | null
  user: { email: string | null; name: string | null }
  job: { title: string }
  company: { name: string | null } | null
}

export type StatusChangeResult =
  | { ok: true }
  | { ok: false; error: string }

/**
 * 1 件の応募のステータスを変更する。
 * 遷移が許可されていない場合は何も更新せず { ok: false } を返す。
 */
export async function applyApplicationStatusChange(args: {
  application: ApplicationForStatusChange
  newStatus: string
  note?: string
  actorUserId: string
}): Promise<StatusChangeResult> {
  const { application, newStatus, note, actorUserId } = args
  const currentStatus = application.status

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes(newStatus)) {
    return {
      ok: false,
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
    by: actorUserId,
    ...(note ? { note } : {}),
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

  return { ok: true }
}

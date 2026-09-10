/**
 * 企業側からの Application ステータス変更を一元化するヘルパー。
 *
 * 単一更新 (PUT /api/company/applications/[id]) と一括更新
 * (POST /api/company/applications/bulk) の両方から使う。
 * 以前は bulk 側が Prisma の updateMany を直接叩いており、状態遷移の
 * バリデーション・statusHistory 監査ログ・hiredAt 打刻・成果報酬請求
 * (createHiringInvoice) をすべてバイパスしていた
 * （一括で「採用」にしても請求が一切発生しない、という実害あり）。
 */

import { prisma } from "@/lib/db"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"
import { parsePrefs } from "@/lib/notification-prefs"

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

export type StatusChangeResult =
  | { ok: true; id: string }
  | { ok: false; id: string; error: string }

export async function changeApplicationStatus(args: {
  id: string
  companyId: string
  newStatus: string
  by: string
  note?: string
}): Promise<StatusChangeResult> {
  const { id, companyId, newStatus, by, note } = args

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      companyId: true,
      userId: true,
      status: true,
      statusHistory: true,
      hiredAt: true,
      user: { select: { email: true, name: true, notificationPrefs: true } },
      job: { select: { title: true } },
      company: { select: { name: true } },
    },
  })

  if (!application || application.companyId !== companyId) {
    return { ok: false, id, error: "応募が見つかりません" }
  }

  const currentStatus = application.status
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes(newStatus)) {
    return {
      ok: false,
      id,
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

  // 採用確定時の自動請求（重複防止・failed 時の再試行判定は createHiringInvoice 内で行う）
  if (newStatus === "hired") {
    try {
      const { createHiringInvoice } = await import("@/lib/billing")
      await createHiringInvoice(id)
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

  // ステータス通知メール（fire-and-forget）。
  // 通知設定でメール受信を OFF にしているユーザーには送らない
  // （マイページの inbox 通知は上の notifyApplicationStatusChange で別途記録済み）。
  const emailEnabled = parsePrefs(application.user.notificationPrefs).emailEnabled
  if (application.user.email && emailEnabled) {
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

  return { ok: true, id }
}

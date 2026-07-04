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
 * 単体更新 (/api/company/applications/[id] PUT) と同じ不変条件を維持する:
 *   - ステータス遷移は VALID_STATUS_TRANSITIONS の範囲内のみ許可 (それ以外は skip)
 *   - hired 遷移時は hiredAt を打刻 (早期離職 戻入処理の起算点)
 *   - hired 遷移時は自動請求 (createHiringInvoice) を実行 (これが無いと採用課金が発生しない)
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

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

  const applications = await prisma.application.findMany({
    where: { id: { in: ids }, companyId },
    select: {
      id: true,
      status: true,
      hiredAt: true,
      userId: true,
      user: { select: { email: true, name: true } },
      job: { select: { title: true } },
      company: { select: { name: true } },
    },
  })

  // 現在ステータスから newStatus への遷移が許可されているものだけ対象にする
  // (単体更新と同じ不変条件。既に終端ステータスのものや逆行はここで除外される)
  const eligible = applications.filter((app) =>
    VALID_STATUS_TRANSITIONS[app.status]?.includes(newStatus)
  )

  for (const app of eligible) {
    await prisma.application.update({
      where: { id: app.id },
      data: {
        status: newStatus,
        ...(newStatus === "hired" && !app.hiredAt ? { hiredAt: new Date() } : {}),
      },
    })

    if (newStatus === "hired") {
      try {
        const existingBilling = await prisma.billingEvent.findFirst({
          where: { applicationId: app.id, eventType: "hired" },
        })
        if (!existingBilling) {
          const { createHiringInvoice } = await import("@/lib/billing")
          await createHiringInvoice(app.id)
        }
      } catch (error) {
        console.error(
          `[billing] Failed to create invoice for application ${app.id} (bulk):`,
          error
        )
      }
    }

    notifyApplicationStatusChange({
      userId: app.userId,
      applicationId: app.id,
      newStatus,
      jobTitle: app.job.title,
    }).catch((e) => {
      console.warn(`[notification] failed: ${e instanceof Error ? e.message : e}`)
    })

    if (app.user.email) {
      sendApplicationStatusEmail({
        to: app.user.email,
        candidateName: app.user.name ?? null,
        companyName: app.company?.name ?? "—",
        jobTitle: app.job.title,
        newStatus,
      }).catch((e) => {
        console.warn(`[application-notify] failed: ${e instanceof Error ? e.message : e}`)
      })
    }
  }

  return Response.json({
    ok: true,
    updated: eligible.length,
    skipped: ids.length - eligible.length,
  })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"
import { syncApplicationToCalendar } from "@/lib/application-calendar-sync"

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
  // hired と rejected は終端ステータス
}

// 既存互換: { status } 単体更新
const updateStatusSchema = z.object({
  status: z.enum([
    "applied",
    "reviewing",
    "interview",
    "offered",
    "hired",
    "rejected",
  ]),
  note: z.string().max(500).optional(),
})

// 拡張: 社内メモ / 面接情報の単独更新
const updateNotesSchema = z.object({
  internalNotes: z.string().max(4000).nullable().optional(),
  interviewAt: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .optional(),
  interviewVenue: z.string().max(500).nullable().optional(),
  interviewUrl: z.string().url().max(500).nullable().optional(),
  interviewSlots: z
    .array(z.string().datetime({ offset: true }))
    .max(5)
    .optional(),
})

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
  note?: string
}

async function getCompanyCtx() {
  const session = await auth()
  if (!session?.user) {
    return { error: "ログインが必要です", status: 401 as const }
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return { error: "企業アカウントでログインしてください", status: 403 as const }
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return { error: "企業情報が見つかりません", status: 403 as const }
  }
  const userId = (session.user as { id?: string }).id ?? "unknown"
  return { companyId, userId }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCompanyCtx()
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  const { id } = await params

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

  if (!application || application.companyId !== ctx.companyId) {
    return Response.json({ error: "応募が見つかりません" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = updateStatusSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "無効なステータスです", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const newStatus = parsed.data.status
  const currentStatus = application.status

  const allowed = VALID_STATUS_TRANSITIONS[currentStatus]
  if (!allowed || !allowed.includes(newStatus)) {
    return Response.json(
      { error: `「${currentStatus}」から「${newStatus}」への変更はできません` },
      { status: 400 }
    )
  }

  const history = Array.isArray(application.statusHistory)
    ? (application.statusHistory as unknown as StatusHistoryEntry[])
    : []
  const entry: StatusHistoryEntry = {
    from: currentStatus,
    to: newStatus,
    at: new Date().toISOString(),
    by: ctx.userId,
    ...(parsed.data.note ? { note: parsed.data.note } : {}),
  }

  const updated = await prisma.application.update({
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
      note: parsed.data.note,
    }).catch((e) => {
      console.warn(`[application-notify] failed: ${e instanceof Error ? e.message : e}`)
    })
  }

  return Response.json({ application: updated })
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getCompanyCtx()
  if ("error" in ctx) {
    return Response.json({ error: ctx.error }, { status: ctx.status })
  }

  const { id } = await params

  const application = await prisma.application.findUnique({
    where: { id },
    select: { companyId: true },
  })
  if (!application || application.companyId !== ctx.companyId) {
    return Response.json({ error: "応募が見つかりません" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = updateNotesSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }
  const data = parsed.data

  const updated = await prisma.application.update({
    where: { id },
    data: {
      ...(data.internalNotes !== undefined
        ? { internalNotes: data.internalNotes }
        : {}),
      ...(data.interviewAt !== undefined
        ? { interviewAt: data.interviewAt ? new Date(data.interviewAt) : null }
        : {}),
      ...(data.interviewUrl !== undefined
        ? { interviewUrl: data.interviewUrl }
        : {}),
      ...(data.interviewVenue !== undefined
        ? { interviewVenue: data.interviewVenue }
        : {}),
      ...(data.interviewSlots !== undefined
        ? { interviewSlots: data.interviewSlots.map((s) => new Date(s)) }
        : {}),
    },
  })

  // 14.4 面接情報更新 → Google Calendar 同期 (fire-and-forget)
  if (
    data.interviewAt !== undefined ||
    data.interviewVenue !== undefined ||
    data.interviewUrl !== undefined
  ) {
    syncApplicationToCalendar(id).catch((e) => {
      console.warn(
        `[calendar-sync] failed: ${e instanceof Error ? e.message : e}`
      )
    })
  }

  return Response.json({ application: updated })
}

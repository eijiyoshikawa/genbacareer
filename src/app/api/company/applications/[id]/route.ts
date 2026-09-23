import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { syncApplicationToCalendar } from "@/lib/application-calendar-sync"
import { applyApplicationStatusChange } from "@/lib/application-status"

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

  const result = await applyApplicationStatusChange({
    id,
    companyId: ctx.companyId,
    userId: ctx.userId,
    newStatus: parsed.data.status,
    note: parsed.data.note,
  })

  if (!result.ok) {
    const status = result.error === "応募が見つかりません" ? 404 : 400
    return Response.json({ error: result.error }, { status })
  }

  const updated = await prisma.application.findUnique({ where: { id } })
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

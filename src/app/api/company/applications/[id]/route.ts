import { type NextRequest, after } from "next/server"
import { z } from "zod"
import type { Prisma } from "@prisma/client"
import { isValidUuid } from "@/lib/uuid"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { ensureSchema } from "@/lib/ensure-schema"
import { sendApplicationStatusEmail } from "@/lib/application-notifications"
import { notifyApplicationStatusChange } from "@/lib/notifications"
import { syncApplicationToCalendar } from "@/lib/application-calendar-sync"
import { VALID_STATUS_TRANSITIONS, buildOfferSalarySnapshotData } from "@/lib/application-status"

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
  if (!isValidUuid(id)) {
    return Response.json({ error: "応募が見つかりません" }, { status: 404 })
  }

  const application = await prisma.application.findUnique({
    where: { id },
    select: {
      companyId: true,
      userId: true,
      jobId: true,
      status: true,
      statusHistory: true,
      hiredAt: true,
      user: { select: { email: true, name: true, status: true } },
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

  // offer_salary_* など後付けカラムが本番 DB に無い状態で書き込むと P2022 になる。
  // 結果はプロセス内でキャッシュされるため 2 回目以降のコストはほぼ無い。
  await ensureSchema()

  const offerSnapshot = await buildOfferSalarySnapshotData(newStatus, application.jobId)

  // 遷移チェックと更新を原子的にする: 読み取り後に別リクエストがステータスを
  // 変えていた場合 (採用と不採用の同時押下など) は 0 件更新になり 409 を返す。
  // これが無いと「不採用なのに成果報酬の請求だけ残る」状態が起こり得る。
  const { count } = await prisma.application.updateMany({
    where: { id, companyId: ctx.companyId, status: currentStatus },
    data: {
      status: newStatus,
      statusHistory: [...history, entry] as unknown as Prisma.InputJsonValue,
      // 採用確定時に hiredAt を打刻 (C3 戻入処理の経過月数計算の基準)
      ...(newStatus === "hired" && !application.hiredAt
        ? { hiredAt: new Date() }
        : {}),
      ...(offerSnapshot ?? {}),
    },
  })
  if (count === 0) {
    return Response.json(
      {
        error:
          "他の操作でステータスが変更されています。画面を再読み込みしてからやり直してください",
        code: "STALE_STATUS",
      },
      { status: 409 }
    )
  }
  const updated = await prisma.application.findUniqueOrThrow({ where: { id } })

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

  // 退会・凍結済みの求職者には通知しない (退会時にメールは deleted+<id>@deleted.local へ
  // 書き換えられており、送ってもバウンスして送信ドメインの評価を下げるだけ)
  if (application.user.status !== "active") {
    return Response.json({ application: updated })
  }

  // 通知とメールはレスポンス返却後に after() で送る。await も after() も無い
  // fire-and-forget だと、Vercel ではレスポンス返却と同時に関数が凍結され、
  // 送信が落ちる / 次のリクエストまで遅延することがある (一括変更は after() 済み)。
  const notifyUser = {
    id: application.userId,
    email: application.user.email,
    name: application.user.name ?? null,
  }
  const jobTitle = application.job.title
  const companyName = application.company?.name ?? "—"
  after(async () => {
    const results = await Promise.allSettled([
      notifyApplicationStatusChange({
        userId: notifyUser.id,
        applicationId: id,
        newStatus,
        jobTitle,
      }),
      // note は社内向けの変更理由メモ (入力欄にも「求職者には届きません」と表示)。
      // 以前はここで渡していたため、不採用理由などがそのまま本人へメールされていた。
      notifyUser.email
        ? sendApplicationStatusEmail({
            to: notifyUser.email,
            candidateName: notifyUser.name,
            companyName,
            jobTitle,
            newStatus,
          })
        : Promise.resolve(),
    ])
    for (const r of results) {
      if (r.status === "rejected") {
        console.warn(
          `[application-notify] failed: ${r.reason instanceof Error ? r.reason.message : r.reason}`
        )
      }
    }
  })

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
  if (!isValidUuid(id)) {
    return Response.json({ error: "応募が見つかりません" }, { status: 404 })
  }

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
    after(() =>
      syncApplicationToCalendar(id).catch((e) => {
        console.warn(
          `[calendar-sync] failed: ${e instanceof Error ? e.message : e}`
        )
      })
    )
  }

  return Response.json({ application: updated })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  sendApplicationConfirmEmail,
  sendNewApplicationToCompanyEmail,
} from "@/lib/email"
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const applicationSchema = z.object({
  jobId: z.string().uuid(),
  message: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role && role !== "seeker") {
    return Response.json(
      { error: "求職者アカウントでログインしてください" },
      { status: 403 }
    )
  }

  // Per-user rate limit: 30 applications / hour
  const limit = rateLimit(`apply:${session.user.id}`, 30, 60 * 60 * 1000)
  if (!limit.ok) return rateLimitResponse(limit.retryAfterMs)
  const ipLimit = rateLimit(`apply-ip:${getClientIp(request)}`, 60, 60 * 60 * 1000)
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterMs)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = applicationSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { jobId, message } = parsed.data

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      companyId: true,
      title: true,
      company: { select: { name: true, contactEmail: true } },
    },
  })

  if (!job) {
    return Response.json(
      { error: "指定された求人が見つかりません" },
      { status: 404 }
    )
  }

  if (job.status !== "active") {
    return Response.json(
      { error: "この求人は現在募集を停止しています" },
      { status: 400 }
    )
  }

  const existing = await prisma.application.findUnique({
    where: {
      jobId_userId: {
        jobId,
        userId: session.user.id,
      },
    },
  })

  if (existing) {
    return Response.json(
      { error: "この求人にはすでに応募済みです" },
      { status: 409 }
    )
  }

  const application = await prisma.application.create({
    data: {
      jobId,
      userId: session.user.id,
      companyId: job.companyId,
      status: "applied",
      message: message ?? null,
    },
  })

  const applicant = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, name: true },
  })

  // Notifications (fire-and-forget; failures should not break the request)
  if (applicant?.email) {
    sendApplicationConfirmEmail(
      applicant.email,
      job.title,
      job.company?.name ?? "企業"
    ).catch((err) =>
      console.error("[applications] failed to send confirm email:", err)
    )
  }
  if (job.company?.contactEmail) {
    sendNewApplicationToCompanyEmail({
      to: job.company.contactEmail,
      jobTitle: job.title,
      applicantName: applicant?.name ?? "求職者",
      applicationId: application.id,
    }).catch((err) =>
      console.error("[applications] failed to notify company:", err)
    )
  }

  return Response.json({ application }, { status: 201 })
}

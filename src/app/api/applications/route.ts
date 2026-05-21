import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendApplicationConfirmEmail } from "@/lib/email"

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
  if (role !== "seeker") {
    return Response.json(
      { error: "求職者アカウントでログインしてください" },
      { status: 403 }
    )
  }

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

  // Check job exists and is active
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      companyId: true,
      title: true,
      company: { select: { name: true } },
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

  // Check for duplicate application
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

  if (session.user.email && job.company?.name) {
    sendApplicationConfirmEmail(session.user.email, job.title, job.company.name).catch(
      (err) => console.error("[applications] Failed to send confirmation email:", err)
    )
  }

  return Response.json({ application }, { status: 201 })
}

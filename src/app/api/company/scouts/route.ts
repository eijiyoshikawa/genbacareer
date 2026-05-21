import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendScoutNotificationEmail } from "@/lib/email"

const scoutSchema = z.object({
  userId: z.string().uuid(),
  jobId: z.string().uuid().nullable().optional(),
  message: z.string().min(1).max(2000),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "企業アカウントでログインしてください" }, { status: 403 })
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "企業情報が見つかりません" }, { status: 403 })
  }

  const { searchParams } = request.nextUrl
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const perPage = 20
  const status = searchParams.get("status")

  const where = {
    companyId,
    ...(status && status !== "all" ? { status } : {}),
  }

  const [scouts, total] = await Promise.all([
    prisma.scout.findMany({
      where,
      orderBy: { sentAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        user: { select: { name: true, email: true, prefecture: true } },
        job: { select: { id: true, title: true } },
      },
    }),
    prisma.scout.count({ where }),
  ])

  return Response.json({ scouts, total, page, perPage })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "企業アカウントでログインしてください" }, { status: 403 })
  }

  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "企業情報が見つかりません" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = scoutSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { userId, jobId, message } = parsed.data

  // Check user exists and profile is public
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { profilePublic: true, email: true },
  })

  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  if (!user.profilePublic) {
    return Response.json(
      { error: "このユーザーはプロフィールを非公開にしています" },
      { status: 400 }
    )
  }

  // Check if job belongs to company (if specified)
  if (jobId) {
    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: { companyId: true },
    })
    if (!job || job.companyId !== companyId) {
      return Response.json({ error: "指定された求人が見つかりません" }, { status: 404 })
    }
  }

  const scout = await prisma.scout.create({
    data: {
      companyId,
      userId,
      jobId: jobId ?? null,
      message,
      status: "sent",
    },
  })

  if (user.email) {
    prisma.company
      .findUnique({ where: { id: companyId }, select: { name: true } })
      .then((company) => {
        if (company?.name) {
          return sendScoutNotificationEmail(user.email!, company.name)
        }
      })
      .catch((err) => console.error("[scouts] Failed to send notification email:", err))
  }

  return Response.json({ scout }, { status: 201 })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendApplicationMessageEmail } from "@/lib/email"

const schema = z.object({
  body: z.string().min(1).max(5000),
})

type SessionRole = "seeker" | "company_admin" | "company_member" | undefined

async function authorize(applicationId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "ログインが必要です", status: 401 as const }

  const role = (session.user as { role?: SessionRole }).role
  const companyId = (session.user as { companyId?: string }).companyId

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      userId: true,
      companyId: true,
      user: { select: { email: true, name: true } },
      job: { select: { title: true } },
      company: { select: { name: true, contactEmail: true } },
    },
  })

  if (!application) {
    return { error: "応募が見つかりません", status: 404 as const }
  }

  // Seeker: own application
  if ((!role || role === "seeker") && application.userId === session.user.id) {
    return { session, application, senderKind: "seeker" as const }
  }

  // Company: must match companyId
  if (
    (role === "company_admin" || role === "company_member") &&
    application.companyId &&
    application.companyId === companyId
  ) {
    return { session, application, senderKind: "company" as const }
  }

  return { error: "権限がありません", status: 403 as const }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await authorize(id)
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status })
  }

  const messages = await prisma.applicationMessage.findMany({
    where: { applicationId: id },
    orderBy: { createdAt: "asc" },
  })

  return Response.json({ messages })
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const result = await authorize(id)
  if ("error" in result) {
    return Response.json({ error: result.error }, { status: result.status })
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

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 }
    )
  }

  const message = await prisma.applicationMessage.create({
    data: {
      applicationId: id,
      senderKind: result.senderKind,
      senderId: result.session.user!.id ?? null,
      body: parsed.data.body,
    },
  })

  // Cross-side notification
  const { application, senderKind } = result
  const jobTitle = application.job?.title ?? "求人"

  if (senderKind === "seeker" && application.company?.contactEmail) {
    sendApplicationMessageEmail({
      to: application.company.contactEmail,
      jobTitle,
      senderLabel: application.user?.name ?? "求職者",
      body: parsed.data.body,
      recipient: "company",
    }).catch((err) => console.error("[app-message] notify company:", err))
  }
  if (senderKind === "company" && application.user?.email) {
    sendApplicationMessageEmail({
      to: application.user.email,
      jobTitle,
      senderLabel: application.company?.name ?? "企業",
      body: parsed.data.body,
      recipient: "seeker",
    }).catch((err) => console.error("[app-message] notify seeker:", err))

    prisma.notification
      .create({
        data: {
          userId: application.userId,
          kind: "application_status",
          title: "新着メッセージ",
          body: `${application.company?.name ?? "企業"} からメッセージが届きました`,
          linkUrl: "/mypage/applications",
        },
      })
      .catch((err) => console.error("[app-message] notification:", err))
  }

  return Response.json({ message }, { status: 201 })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendScoutResponseEmail } from "@/lib/email"

const respondSchema = z.object({
  action: z.enum(["reply", "decline"]),
  message: z.string().max(2000).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエストの形式が正しくありません" },
      { status: 400 }
    )
  }

  const parsed = respondSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const scout = await prisma.scout.findUnique({
    where: { id },
    select: {
      userId: true,
      status: true,
      company: { select: { contactEmail: true, name: true } },
      user: { select: { name: true } },
    },
  })

  if (!scout || scout.userId !== session.user.id) {
    return Response.json({ error: "スカウトが見つかりません" }, { status: 404 })
  }

  if (scout.status === "replied" || scout.status === "declined") {
    return Response.json(
      { error: "このスカウトには既に応答済みです" },
      { status: 400 }
    )
  }

  const newStatus = parsed.data.action === "reply" ? "replied" : "declined"

  const updated = await prisma.scout.update({
    where: { id },
    data: {
      status: newStatus,
      replyMessage: parsed.data.message ?? null,
      respondedAt: new Date(),
    },
  })

  if (scout.company?.contactEmail) {
    sendScoutResponseEmail({
      to: scout.company.contactEmail,
      applicantName: scout.user?.name ?? "求職者",
      response: newStatus,
      replyMessage: parsed.data.message ?? null,
    }).catch((err) =>
      console.error("[scouts] failed to notify company:", err)
    )
  }

  return Response.json({ scout: updated })
}

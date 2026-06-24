/**
 * POST /api/admin/career-interviews
 * キャリア面談の完了を記録し、求職者にポイントを付与する。認証: admin 必須。
 *
 * コーディネーターが面談実施後、対象者のメールアドレスを指定して登録する。
 * 付与は awardCareerInterviewPoints が冪等に処理する。
 *
 * Body: { email, coordinator?, note? }
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { awardCareerInterviewPoints } from "@/lib/points"

export async function POST(request: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

  let body: Record<string, unknown> = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
  if (!email) return Response.json({ error: "メールアドレスを入力してください" }, { status: 400 })

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } })
  if (!user) {
    return Response.json({ error: "該当する求職者が見つかりません" }, { status: 404 })
  }

  const interview = await prisma.careerInterview.create({
    data: {
      userId: user.id,
      coordinator: typeof body.coordinator === "string" ? body.coordinator.slice(0, 100) : null,
      note: typeof body.note === "string" ? body.note.slice(0, 1000) : null,
      status: "scheduled",
      scheduledAt: new Date(),
    },
  })

  const granted = await awardCareerInterviewPoints(interview.id)
  return Response.json({ ok: true, granted, interviewId: interview.id })
}

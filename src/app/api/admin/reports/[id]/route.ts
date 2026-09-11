import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { toActorUuid } from "@/lib/actor-id"

const patchSchema = z.object({
  status: z.enum(["resolved", "dismissed"]),
  resolution: z.string().max(500).nullable().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が正しくありません" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const report = await prisma.report.findUnique({ where: { id } })
  if (!report) {
    return Response.json({ error: "通報が見つかりません" }, { status: 404 })
  }
  if (report.status !== "open") {
    return Response.json(
      { error: "既に対応済みです" },
      { status: 409 }
    )
  }

  await prisma.report.update({
    where: { id },
    data: {
      status: parsed.data.status,
      resolution: parsed.data.resolution ?? null,
      resolvedAt: new Date(),
      resolvedBy: toActorUuid(session.user.id),
    },
  })

  return Response.json({ ok: true })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const schema = z.object({
  action: z.enum(["suspend", "approve", "close"]),
  note: z.string().max(2000).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return Response.json({ error: "権限がありません" }, { status: 403 })
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

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 }
    )
  }

  const job = await prisma.job.findUnique({ where: { id } })
  if (!job) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  const data: { status?: string; moderationNote?: string | null } = {
    moderationNote: parsed.data.note ?? null,
  }
  if (parsed.data.action === "suspend") data.status = "suspended"
  if (parsed.data.action === "approve") data.status = "active"
  if (parsed.data.action === "close") data.status = "closed"

  const updated = await prisma.job.update({ where: { id }, data })

  return Response.json({ job: updated })
}

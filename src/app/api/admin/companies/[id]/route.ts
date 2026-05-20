import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const schema = z.object({
  action: z.enum(["approve", "suspend", "unsuspend"]),
})

async function ensureAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await ensureAdmin()
  if (!session) {
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

  const company = await prisma.company.findUnique({ where: { id } })
  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  const now = new Date()
  const data =
    parsed.data.action === "approve"
      ? { approvedAt: now, suspendedAt: null }
      : parsed.data.action === "suspend"
        ? { suspendedAt: now }
        : { suspendedAt: null }

  const updated = await prisma.company.update({
    where: { id },
    data,
  })

  return Response.json({ company: updated })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const schema = z.object({ handled: z.boolean() })

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
    return Response.json({ error: "入力が不正です" }, { status: 400 })
  }

  const contact = await prisma.contactMessage.findUnique({ where: { id } })
  if (!contact) {
    return Response.json(
      { error: "お問い合わせが見つかりません" },
      { status: 404 }
    )
  }

  await prisma.contactMessage.update({
    where: { id },
    data: { handledAt: parsed.data.handled ? new Date() : null },
  })

  return Response.json({ success: true })
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  alertEnabled: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const { id } = await params

  const search = await prisma.savedSearch.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!search || search.userId !== session.user.id) {
    return Response.json(
      { error: "保存条件が見つかりません" },
      { status: 404 }
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

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります" },
      { status: 400 }
    )
  }

  const updated = await prisma.savedSearch.update({
    where: { id },
    data: parsed.data,
  })

  return Response.json({ search: updated })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const { id } = await params

  const search = await prisma.savedSearch.findUnique({
    where: { id },
    select: { userId: true },
  })
  if (!search || search.userId !== session.user.id) {
    return Response.json(
      { error: "保存条件が見つかりません" },
      { status: 404 }
    )
  }

  await prisma.savedSearch.delete({ where: { id } })
  return Response.json({ success: true })
}

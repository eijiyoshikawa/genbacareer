import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const patchSchema = z.object({
  isActive: z.boolean(),
})

type RouteParams = { params: Promise<{ id: string }> }

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  return role === "admin"
}

export async function PATCH(req: Request, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }
  const { id } = await params
  const body = await req.json().catch(() => null)
  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "入力が不正です" }, { status: 400 })
  }

  try {
    await prisma.adminUser.update({
      where: { id },
      data: { isActive: parsed.data.isActive },
    })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "更新に失敗しました" }, { status: 404 })
  }
}

export async function DELETE(_: Request, { params }: RouteParams) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }
  const { id } = await params
  try {
    await prisma.adminUser.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: "削除に失敗しました" }, { status: 404 })
  }
}

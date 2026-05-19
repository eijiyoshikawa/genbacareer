import { NextResponse } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function generateTempPassword(): string {
  // 英大小数字記号 16 文字。crypto.getRandomValues で安全に。
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%&*-_"
  const arr = new Uint32Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join("")
}

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().max(100).optional().nullable(),
})

export async function POST(req: Request) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力が不正です", issues: parsed.error.issues },
      { status: 400 }
    )
  }

  const email = parsed.data.email.trim().toLowerCase()
  const name = parsed.data.name?.trim() || null

  // 重複チェック（ENV オーナーと同じも禁止）
  if (
    process.env.ADMIN_EMAIL &&
    email === process.env.ADMIN_EMAIL.trim().toLowerCase()
  ) {
    return NextResponse.json(
      { error: "このメールはオーナーとして登録済みです" },
      { status: 409 }
    )
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json(
      { error: "このメールは既に管理者として登録されています" },
      { status: 409 }
    )
  }

  const password = generateTempPassword()
  const passwordHash = await hash(password, 10)

  await prisma.adminUser.create({
    data: {
      email,
      name,
      passwordHash,
      invitedBy: session?.user?.email ?? null,
    },
  })

  return NextResponse.json({ ok: true, password })
}

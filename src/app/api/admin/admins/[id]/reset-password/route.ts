import { NextResponse } from "next/server"
import { hash } from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

function generateTempPassword(): string {
  const chars =
    "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#%&*-_"
  const arr = new Uint32Array(16)
  crypto.getRandomValues(arr)
  return Array.from(arr, (n) => chars[n % chars.length]).join("")
}

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(_: Request, { params }: RouteParams) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (role !== "admin") {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }

  const { id } = await params
  const password = generateTempPassword()
  const passwordHash = await hash(password, 10)

  try {
    await prisma.adminUser.update({
      where: { id },
      data: { passwordHash },
    })
    return NextResponse.json({ ok: true, password })
  } catch {
    return NextResponse.json({ error: "対象が見つかりません" }, { status: 404 })
  }
}

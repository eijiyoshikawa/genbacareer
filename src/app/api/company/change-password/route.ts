import { type NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインしてください" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "企業アカウント専用です" }, { status: 403 })
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return Response.json({ error: "セッション不正" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります" },
      { status: 400 }
    )
  }

  const user = await prisma.companyUser.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!ok) {
    return Response.json(
      { error: "現在のパスワードが正しくありません" },
      { status: 400 }
    )
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return Response.json(
      { error: "新しいパスワードは現在のパスワードと異なる必要があります" },
      { status: 400 }
    )
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.companyUser.update({
    where: { id: userId },
    data: { passwordHash: newHash, mustChangePassword: false },
  })

  return Response.json({ ok: true })
}

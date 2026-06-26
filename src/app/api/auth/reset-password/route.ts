import { type NextRequest } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const { token, password } = parsed.data

  const user = await prisma.user.findUnique({
    where: { resetToken: token },
    select: { id: true, resetTokenExpiry: true },
  })

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
    // タイミング攻撃対策: token が存在しない場合も存在して期限切れの場合も
    // 同じ遅延を入れることで応答時間から token の有無を推測されるのを防ぐ
    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return Response.json(
      { error: "リセットリンクが無効または期限切れです。再度お試しください。" },
      { status: 400 }
    )
  }

  const passwordHash = await hash(password, 12)

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  return Response.json({ message: "パスワードが正常にリセットされました。" })
}

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

  const passwordHash = await hash(password, 12)

  // findUnique → update の2ステップだとトークンが並列リクエストで使い回される
  // 恐れがある。updateMany で「トークン一致 + 有効期限内」を WHERE に含めることで
  // 単一のアトミック操作としてトークンを消費する。
  const result = await prisma.user.updateMany({
    where: {
      resetToken: token,
      resetTokenExpiry: { gt: new Date() },
    },
    data: {
      passwordHash,
      resetToken: null,
      resetTokenExpiry: null,
    },
  })

  if (result.count === 0) {
    return Response.json(
      { error: "リセットリンクが無効または期限切れです。再度お試しください。" },
      { status: 400 }
    )
  }

  return Response.json({ message: "パスワードが正常にリセットされました。" })
}

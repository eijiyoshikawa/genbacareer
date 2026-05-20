import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"

const schema = z.object({
  token: z.string().min(1),
})

export async function POST(request: NextRequest) {
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
      { error: "トークンが指定されていません" },
      { status: 400 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { emailVerifyToken: parsed.data.token },
    select: { id: true, emailVerifyTokenExpiry: true, emailVerifiedAt: true },
  })

  if (
    !user ||
    !user.emailVerifyTokenExpiry ||
    user.emailVerifyTokenExpiry < new Date()
  ) {
    return Response.json(
      { error: "確認リンクが無効または期限切れです。再送をお試しください。" },
      { status: 400 }
    )
  }

  if (user.emailVerifiedAt) {
    return Response.json({ message: "すでに確認済みです" })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      emailVerifyToken: null,
      emailVerifyTokenExpiry: null,
    },
  })

  return Response.json({ message: "メールアドレスを確認しました" })
}

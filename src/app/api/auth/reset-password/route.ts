import { type NextRequest } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
})

export async function POST(request: NextRequest) {
  // レート制限: 同一 IP から 15 分間に 5 回まで
  const rl = checkRateLimit({
    key: `reset-password:${getClientIp(request)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

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

  // updateMany でトークン検証と無効化をアトミックに実行。
  // findUnique→update の 2 ステップだと並列リクエスト時に同一トークンが
  // 複数回使用される競合状態が生じるため、WHERE にトークンと有効期限を含める。
  const result = await prisma.user.updateMany({
    where: {
      resetToken: token,
      resetTokenExpiry: { gte: new Date() },
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

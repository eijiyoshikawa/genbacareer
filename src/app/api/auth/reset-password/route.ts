import { type NextRequest } from "next/server"
import { z } from "zod"
import { hash } from "bcryptjs"
import { prisma } from "@/lib/db"
import { hashToken } from "@/lib/tokens"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
})

export async function POST(request: NextRequest) {
  // レート制限: 同一 IP から 15 分間に 5 回まで。
  // reset-password はトークンのブルートフォースを狙われる経路なので
  // forgot-password と同等の厳しさで絞る。
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

  // DB にはハッシュを保存しているので、受け取った平文トークンをハッシュ化して照合
  const user = await prisma.user.findUnique({
    where: { resetToken: hashToken(token) },
    select: { id: true, resetTokenExpiry: true },
  })

  if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
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
    // 更新後に全カラムを SELECT して返さない（無関係なカラム欠落で巻き込まれないよう）
    select: { id: true },
  })

  return Response.json({ message: "パスワードが正常にリセットされました。" })
}

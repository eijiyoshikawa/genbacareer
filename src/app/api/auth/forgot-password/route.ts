import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { generateToken, TOKEN_EXPIRY_MS } from "@/lib/tokens"
import { sendPasswordResetEmail } from "@/lib/email"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  // レート制限: 同一 IP から 15 分間に 3 回まで
  const rl = checkRateLimit({
    key: `forgot-password:${getClientIp(request)}`,
    limit: 3,
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
    return Response.json({ error: "メールアドレスの形式が正しくありません" }, { status: 400 })
  }

  const { email } = parsed.data

  // Always return success to prevent email enumeration
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })

  if (user) {
    const token = generateToken()
    const expiry = new Date(Date.now() + TOKEN_EXPIRY_MS)

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: token, resetTokenExpiry: expiry },
    })

    try {
      await sendPasswordResetEmail(email, token)
    } catch (error) {
      console.error("[forgot-password] Failed to send email:", error)
    }
  }

  return Response.json({
    message: "メールアドレスが登録されている場合、リセット用のメールを送信しました。",
  })
}

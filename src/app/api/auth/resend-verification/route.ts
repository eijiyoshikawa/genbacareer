import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { sendVerificationEmail } from "@/lib/email"
import { generateToken, EMAIL_VERIFY_EXPIRY_MS } from "@/lib/tokens"
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().email(),
})

export async function POST(request: NextRequest) {
  const ipLimit = rateLimit(
    `verify-resend:${getClientIp(request)}`,
    5,
    60 * 60 * 1000
  )
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterMs)

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
      { error: "メールアドレスの形式が正しくありません" },
      { status: 400 }
    )
  }

  // Always respond success to prevent email enumeration
  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email },
    select: { id: true, emailVerifiedAt: true, deletedAt: true },
  })

  if (user && !user.emailVerifiedAt && !user.deletedAt) {
    const token = generateToken()
    const expiry = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS)
    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: token, emailVerifyTokenExpiry: expiry },
    })
    sendVerificationEmail(parsed.data.email, token).catch((err) =>
      console.error("[resend-verification] failed:", err)
    )
  }

  return Response.json({
    message: "未確認のアカウントが存在する場合、確認メールを再送しました。",
  })
}

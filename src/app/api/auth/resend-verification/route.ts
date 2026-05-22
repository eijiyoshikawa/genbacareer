/**
 * 確認メール再送エンドポイント
 *
 * POST /api/auth/resend-verification
 * Body: { email: string }
 *
 * - 既に確認済みの場合は 200 を返すが、無闇に再送はしない（ユーザー列挙対策で常に成功扱い）
 * - 未確認の場合は新トークンを発行（既存トークンを上書き）して確認メールを再送
 * - レート制限: 同一 IP から 15 分間に 3 回まで
 */
import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { generateToken } from "@/lib/tokens"
import { sendEmailVerificationEmail } from "@/lib/email"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  email: z.string().email(),
})

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

export async function POST(request: NextRequest) {
  const rl = checkRateLimit({
    key: `resend-verification:${getClientIp(request)}`,
    limit: 3,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

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

  const { email } = parsed.data
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  })

  // ユーザー列挙対策: 存在の有無/確認状態に関わらず同じレスポンスを返す
  const standardResponse = Response.json({
    message:
      "メールアドレスが登録されていて未確認の場合、確認メールを再送しました。",
  })

  if (!user || user.emailVerified) return standardResponse

  const verificationToken = generateToken()
  const verificationTokenExpiry = new Date(
    Date.now() + VERIFICATION_TOKEN_EXPIRY_MS
  )

  await prisma.user.update({
    where: { id: user.id },
    data: { verificationToken, verificationTokenExpiry },
  })

  try {
    await sendEmailVerificationEmail(email, verificationToken)
  } catch (error) {
    console.error("[resend-verification] Failed to send email:", error)
  }

  return standardResponse
}

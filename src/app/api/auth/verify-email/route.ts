/**
 * メールアドレス確認エンドポイント
 *
 * POST /api/auth/verify-email
 * Body: { token: string }
 *
 * サインアップ時に発行された verification_token を検証し、
 * 成功時は emailVerified に現在時刻をセットしてトークンを破棄する。
 */
import { type NextRequest } from "next/server"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  token: z.string().min(16),
})

export async function POST(request: NextRequest) {
  // レート制限: 同一 IP から 15 分間に 20 回まで（トークンの brute-force 抑止）
  const rl = checkRateLimit({
    key: `verify-email:${getClientIp(request)}`,
    limit: 20,
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
      { error: "確認トークンが正しくありません" },
      { status: 400 }
    )
  }

  const { token } = parsed.data

  const user = await prisma.user.findUnique({
    where: { verificationToken: token },
    select: {
      id: true,
      email: true,
      emailVerified: true,
      verificationTokenExpiry: true,
    },
  })

  if (!user) {
    return Response.json(
      { error: "確認リンクが無効です。再度ご登録ください。" },
      { status: 400 }
    )
  }

  if (user.emailVerified) {
    return Response.json({
      success: true,
      alreadyVerified: true,
      message: "このメールアドレスは既に確認済みです。",
    })
  }

  if (
    !user.verificationTokenExpiry ||
    user.verificationTokenExpiry < new Date()
  ) {
    return Response.json(
      {
        error:
          "確認リンクの有効期限が切れています。お手数ですが再度ご登録ください。",
      },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
      verificationToken: null,
      verificationTokenExpiry: null,
    },
  })

  return Response.json({
    success: true,
    message: "メールアドレスの確認が完了しました。",
  })
}

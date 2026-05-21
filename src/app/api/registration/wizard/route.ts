import { NextResponse } from "next/server"
import { z } from "zod"
import { hashSync } from "bcryptjs"
import { prisma } from "@/lib/db"
import { generateToken } from "@/lib/tokens"
import { sendEmailVerificationEmail } from "@/lib/email"
import {
  checkRateLimit,
  getClientIp,
  rateLimitResponse,
} from "@/lib/rate-limit"
import { trackEvent } from "@/lib/track"

/**
 * 求職者ウィザード登録 API (POST /api/registration/wizard)。
 *
 * /register/wizard の最終ステップで呼び出され、収集した回答をまとめて
 * User テーブルに保存 → 確認メール送信 → 完了画面に遷移させる。
 *
 * 既存の /api/auth/register と並列で運用 (既存ユーザーには影響しない)。
 */

const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000

const wizardSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  answers: z.object({
    prefecture: z.string().optional(),
    city: z.string().optional(),
    experiencedCategories: z.array(z.string()).optional(),
    experiencedSubcategories: z.array(z.string()).optional(),
    experienceYears: z.string().optional(),
    companyCount: z.string().optional(),
    desiredPrefectures: z.array(z.string()).optional(),
    desiredSalaryMin: z.number().optional(),
    desiredTransferTiming: z.string().optional(),
    nameLast: z.string().min(1),
    nameFirst: z.string().min(1),
    nameLastKana: z.string().min(1),
    nameFirstKana: z.string().min(1),
    phone: z.string().regex(/^0\d{9,10}$/),
  }),
})

export async function POST(request: Request) {
  // レート制限: 同一 IP から 15 分間に 5 回まで
  const rl = checkRateLimit({
    key: `wizard-register:${getClientIp(request)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  try {
    const body = await request.json()
    const parsed = wizardSchema.safeParse(body)
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。"
      return NextResponse.json({ error: firstError }, { status: 400 })
    }

    const { email, password, answers } = parsed.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています。" },
        { status: 409 },
      )
    }

    const passwordHash = hashSync(password, 12)
    const verificationToken = generateToken()
    const verificationTokenExpiry = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_MS,
    )

    const name = `${answers.nameLast} ${answers.nameFirst}`

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: answers.phone,
        prefecture: answers.prefecture,
        city: answers.city,
        desiredCategories: answers.experiencedCategories ?? [],
        desiredSalaryMin: answers.desiredSalaryMin,
        authProvider: "email",
        verificationToken,
        verificationTokenExpiry,
        termsAcceptedAt: new Date(),
        // 18 歳以上は規約同意で担保 (Wizard では生年月日を取らない)
      },
    })

    // 確認メール送信 (失敗しても登録は成功扱い、ユーザーには再送案内可能)
    sendEmailVerificationEmail(email, verificationToken).catch((e) => {
      console.warn(
        `[wizard-register] verification email failed for ${email}:`,
        e instanceof Error ? e.message : e,
      )
    })

    // イベント計測
    void trackEvent({
      name: "wizard_register",
      payload: {
        userId: user.id,
        hasExperience:
          (answers.experiencedSubcategories?.length ?? 0) > 0,
        desiredPrefCount: answers.desiredPrefectures?.length ?? 0,
      },
    })

    return NextResponse.json({
      ok: true,
      email,
      message:
        "確認メールを送信しました。メール内の URL をクリックして登録を完了してください。",
    })
  } catch (err) {
    console.error("[wizard-register] failed:", err)
    return NextResponse.json(
      { error: "登録に失敗しました。時間をおいてお試しください。" },
      { status: 500 },
    )
  }
}

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
import { normalizePhone, isMobilePhone } from "@/lib/registration/phone"

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
  email: z.string().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは 8 文字以上で入力してください"),
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
    nameLast: z.string().min(1, "姓を入力してください"),
    nameFirst: z.string().min(1, "名を入力してください"),
    nameLastKana: z.string().min(1, "セイを入力してください"),
    nameFirstKana: z.string().min(1, "メイを入力してください"),
    // 全角・ハイフン混入を許容しつつサーバ側で正規化 + 070/080/090 のみ受理
    phone: z
      .string()
      .refine((v) => isMobilePhone(v), {
        message: "携帯番号 (070 / 080 / 090) を入力してください",
      }),
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
    const normalizedPhone = normalizePhone(answers.phone)

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        phone: normalizedPhone,
        prefecture: answers.prefecture,
        city: answers.city,
        // 「経験あり」と「希望」は別概念。Phase 2 で希望カテゴリ入力ステップを
        // 追加するまでは空配列で保存する。
        desiredCategories: [],
        desiredSalaryMin: answers.desiredSalaryMin,
        // experiencedCategories 等は専用カラムが無いため、以前は破棄していた
        // （必須ステップで回答させておきながら保存されない状態だった）。
        // 専用カラム化するまでの保存先として wizardAnswers に残す。
        wizardAnswers: {
          experiencedCategories: answers.experiencedCategories ?? [],
          experiencedSubcategories: answers.experiencedSubcategories ?? [],
          experienceYears: answers.experienceYears ?? null,
          companyCount: answers.companyCount ?? null,
          desiredPrefectures: answers.desiredPrefectures ?? [],
          desiredTransferTiming: answers.desiredTransferTiming ?? null,
        },
        authProvider: "email",
        verificationToken,
        verificationTokenExpiry,
        termsAcceptedAt: new Date(),
        // 18 歳以上は規約同意で担保 (Wizard では生年月日を取らない)
      },
    })

    // 確認メール送信。失敗しても User 作成は成立しているので、
    // クライアントには emailSent: false で通知し、再送導線を表示する。
    let emailSent = true
    try {
      await sendEmailVerificationEmail(email, verificationToken)
    } catch (e) {
      emailSent = false
      console.warn(
        `[wizard-register] verification email failed for ${email}:`,
        e instanceof Error ? e.message : e,
      )
    }

    // イベント計測
    void trackEvent({
      name: "wizard_register",
      payload: {
        userId: user.id,
        hasExperience:
          (answers.experiencedSubcategories?.length ?? 0) > 0,
        desiredPrefCount: answers.desiredPrefectures?.length ?? 0,
        emailSent,
      },
    })

    return NextResponse.json({
      ok: true,
      email,
      emailSent,
      message: emailSent
        ? "確認メールを送信しました。メール内の URL をクリックして登録を完了してください。"
        : "登録は完了しましたが、確認メールの送信に失敗しました。完了画面の再送ボタンからお試しください。",
    })
  } catch (err) {
    console.error("[wizard-register] failed:", err)
    return NextResponse.json(
      { error: "登録に失敗しました。時間をおいてお試しください。" },
      { status: 500 },
    )
  }
}

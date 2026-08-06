import { NextResponse } from "next/server"
import { z } from "zod"
import { hashSync } from "bcryptjs"
import { prisma } from "@/lib/db"
import { ensureSchema } from "@/lib/ensure-schema"
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
 * User テーブルに保存 → 完了画面に遷移させる。
 *
 * 方針: メール確認は「応募の前提条件にしない」。登録時点で emailVerified を
 * セットし、確認メールなしで即・応募できる状態にする（OAuth 登録と同等）。
 */

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

    // このルートは API のみで layout.tsx の fire-and-forget self-heal を経由しない
    // ため、新規カラム未反映のまま prisma.user.* を叩いて P2022 になることがある。
    await ensureSchema()

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています。" },
        { status: 409 },
      )
    }

    const passwordHash = hashSync(password, 12)

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
        // 追加するまでは空配列で保存し、experiencedCategories は Phase 2 で
        // 別カラム or metadata jsonb に格納する。
        desiredCategories: [],
        desiredSalaryMin: answers.desiredSalaryMin,
        authProvider: "email",
        // メール確認を応募の前提にしないため、登録時点で確認済み扱いにする。
        emailVerified: new Date(),
        // スカウト受信の前提となる企業公開は既定で ON（マイページからオフ可能）
        profilePublic: true,
        termsAcceptedAt: new Date(),
        // 18 歳以上は規約同意で担保 (Wizard では生年月日を取らない)
      },
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
      message: "登録が完了しました。さっそく求人を探して応募できます。",
    })
  } catch (err) {
    console.error("[wizard-register] failed:", err)
    return NextResponse.json(
      { error: "登録に失敗しました。時間をおいてお試しください。" },
      { status: 500 },
    )
  }
}

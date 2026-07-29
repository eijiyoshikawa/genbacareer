import { NextResponse } from "next/server";
import { z } from "zod";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { ensureSchema } from "@/lib/ensure-schema";
import { PREFECTURES } from "@/lib/constants";
import { generateToken } from "@/lib/tokens";
import { sendEmailVerificationEmail } from "@/lib/email";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { trackEvent } from "@/lib/track";
import { awardSignupBonus } from "@/lib/points";

const registerSchema = z.object({
  name: z.string().min(1, "氏名は必須です。").max(100, "氏名は100文字以内で入力してください。"),
  email: z.string().email("有効なメールアドレスを入力してください。"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
  prefecture: z.enum(PREFECTURES, "有効な都道府県を選択してください。"),
  birthDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "生年月日は YYYY-MM-DD 形式で入力してください。"),
  termsAccepted: z.literal(true, {
    message: "利用規約への同意が必要です。",
  }),
});

function isAtLeast18(birthDate: Date): boolean {
  const now = new Date();
  const eighteenYearsAgo = new Date(
    now.getFullYear() - 18,
    now.getMonth(),
    now.getDate()
  );
  return birthDate.getTime() <= eighteenYearsAgo.getTime();
}

// メール確認トークンの有効期限: 24 時間
const VERIFICATION_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000;

export async function POST(request: Request) {
  // レート制限: 同一 IP から 15 分間に 5 回まで
  const rl = checkRateLimit({
    key: `register:${getClientIp(request)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });
  if (!rl.allowed) return rateLimitResponse(rl);

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password, prefecture, birthDate } = parsed.data;

    const birthDateObj = new Date(birthDate);
    if (isNaN(birthDateObj.getTime())) {
      return NextResponse.json(
        { error: "生年月日の形式が正しくありません。" },
        { status: 400 }
      );
    }
    if (!isAtLeast18(birthDateObj)) {
      return NextResponse.json(
        { error: "ご利用は 18 歳以上の方に限らせていただいております。" },
        { status: 400 }
      );
    }

    // API のみのルートは layout.tsx の fire-and-forget self-heal を経由しないため、
    // 新規カラム未反映のまま prisma.user.* を叩いて P2022 になることがある。
    await ensureSchema();

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています。" },
        { status: 409 }
      );
    }

    const passwordHash = hashSync(password, 12);
    const verificationToken = generateToken();
    const verificationTokenExpiry = new Date(
      Date.now() + VERIFICATION_TOKEN_EXPIRY_MS
    );

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        prefecture,
        birthDate: birthDateObj,
        verificationToken,
        verificationTokenExpiry,
        termsAcceptedAt: new Date(),
      },
      select: { id: true },
    });

    // 13.4 独自イベントトラッキング
    void trackEvent({
      name: "register_complete",
      userId: user.id,
      payload: { prefecture, authProvider: "email" },
    });

    // ポイント制度: 初回登録ボーナス（1 回のみ・日次上限の対象外）。失敗は握りつぶす。
    void awardSignupBonus(user.id).catch(() => {});

    try {
      await sendEmailVerificationEmail(email, verificationToken);
    } catch (error) {
      console.error("[register] Failed to send verification email:", error);
      // メール送信失敗時もユーザー作成は完了させる（再送機能で復旧可能にする）
    }

    return NextResponse.json(
      {
        success: true,
        message:
          "登録が完了しました。メールアドレスの確認用リンクを送信しましたのでご確認ください。",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}

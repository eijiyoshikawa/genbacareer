import { NextResponse } from "next/server";
import { z } from "zod";
import { hashSync } from "bcryptjs";
import { prisma } from "@/lib/db";
import { PREFECTURES } from "@/lib/constants";
import { generateToken, EMAIL_VERIFY_EXPIRY_MS } from "@/lib/tokens";
import { sendVerificationEmail } from "@/lib/email";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(1, "氏名は必須です。"),
  email: z.string().email("有効なメールアドレスを入力してください。"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
  prefecture: z.enum(PREFECTURES, "有効な都道府県を選択してください。"),
});

export async function POST(request: Request) {
  // Rate limit: 5 registrations per IP per hour
  const ipLimit = rateLimit(`register:${getClientIp(request)}`, 5, 60 * 60 * 1000);
  if (!ipLimit.ok) return rateLimitResponse(ipLimit.retryAfterMs);

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { name, email, password, prefecture } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています。" },
        { status: 409 }
      );
    }

    const passwordHash = hashSync(password, 12);
    const verifyToken = generateToken();
    const verifyExpiry = new Date(Date.now() + EMAIL_VERIFY_EXPIRY_MS);

    await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        prefecture,
        emailVerifyToken: verifyToken,
        emailVerifyTokenExpiry: verifyExpiry,
      },
    });

    sendVerificationEmail(email, verifyToken).catch((err) =>
      console.error("[register] failed to send verification email:", err)
    );

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}

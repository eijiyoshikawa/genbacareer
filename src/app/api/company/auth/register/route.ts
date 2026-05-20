import { NextResponse } from "next/server";
import { z } from "zod";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/db";
import { PREFECTURES } from "@/lib/constants";

const companyRegisterSchema = z.object({
  companyName: z.string().min(1, "会社名は必須です。"),
  industry: z.string().min(1, "業種は必須です。"),
  prefecture: z.enum(PREFECTURES, { message: "有効な都道府県を選択してください。" }),
  contactEmail: z.string().email("有効なメールアドレスを入力してください。"),
  password: z.string().min(8, "パスワードは8文字以上で入力してください。"),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = companyRegisterSchema.safeParse(body);

    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "入力内容に誤りがあります。";
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { companyName, industry, prefecture, contactEmail, password } =
      parsed.data;

    const existingUser = await prisma.companyUser.findUnique({
      where: { email: contactEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "このメールアドレスは既に登録されています。" },
        { status: 409 }
      );
    }

    const passwordHash = await hash(password, 12);

    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          industry,
          prefecture,
          contactEmail,
        },
      });

      await tx.companyUser.create({
        data: {
          companyId: company.id,
          email: contactEmail,
          passwordHash,
          name: companyName,
          role: "admin",
        },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Company registration error:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました。" },
      { status: 500 }
    );
  }
}

import { type NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { checkRateLimit, rateLimitResponse } from "@/lib/rate-limit"

const schema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "ログインしてください" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "企業アカウント専用です" }, { status: 403 })
  }
  const userId = (session.user as { id?: string }).id
  if (!userId) {
    return Response.json({ error: "セッション不正" }, { status: 401 })
  }

  // 盗まれた/XSS 経由のセッション Cookie から現在パスワードを
  // 総当たりされるのを防ぐ（このエンドポイントにレート制限が一切
  // 無く、無制限に試行できてしまっていた）。
  const rl = checkRateLimit({
    key: `company-change-password:${userId}`,
    limit: 10,
    windowMs: 15 * 60 * 1000,
  })
  if (!rl.allowed) return rateLimitResponse(rl)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエスト形式が不正です" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります" },
      { status: 400 }
    )
  }

  const user = await prisma.companyUser.findUnique({
    where: { id: userId },
    select: { passwordHash: true },
  })
  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  const ok = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash)
  if (!ok) {
    return Response.json(
      { error: "現在のパスワードが正しくありません" },
      { status: 400 }
    )
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return Response.json(
      { error: "新しいパスワードは現在のパスワードと異なる必要があります" },
      { status: 400 }
    )
  }

  const newHash = await bcrypt.hash(parsed.data.newPassword, 10)
  await prisma.companyUser.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      // 既存の（盗まれた可能性のある）セッションを次回のアカウント状態
      // 再チェック時に失効させるための基準時刻（src/lib/auth.ts の
      // jwt callback 参照）。
      passwordChangedAt: new Date(),
    },
  })

  return Response.json({ ok: true })
}

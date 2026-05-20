import { type NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { sendAccountDeletedEmail } from "@/lib/email"

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  phone: z.string().max(20).nullable().optional(),
  prefecture: z.string().max(10).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  birthDate: z.string().nullable().optional(),
  desiredCategories: z.array(z.string()).optional(),
  desiredSalaryMin: z.number().int().min(0).nullable().optional(),
  profilePublic: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      prefecture: true,
      city: true,
      birthDate: true,
      desiredCategories: true,
      desiredSalaryMin: true,
      resumeUrl: true,
      profilePublic: true,
      createdAt: true,
    },
  })

  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }

  return Response.json({ user })
}

export async function PUT(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const data = parsed.data

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.phone !== undefined ? { phone: data.phone } : {}),
      ...(data.prefecture !== undefined ? { prefecture: data.prefecture } : {}),
      ...(data.city !== undefined ? { city: data.city } : {}),
      ...(data.birthDate !== undefined
        ? { birthDate: data.birthDate ? new Date(data.birthDate) : null }
        : {}),
      ...(data.desiredCategories !== undefined
        ? { desiredCategories: data.desiredCategories }
        : {}),
      ...(data.desiredSalaryMin !== undefined
        ? { desiredSalaryMin: data.desiredSalaryMin }
        : {}),
      ...(data.profilePublic !== undefined
        ? { profilePublic: data.profilePublic }
        : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      prefecture: true,
      city: true,
      birthDate: true,
      desiredCategories: true,
      desiredSalaryMin: true,
      profilePublic: true,
    },
  })

  return Response.json({ user })
}

/**
 * 退会処理。
 * - 法的・運用上の安全性のため、関連レコード（応募・スカウト・通知 等）は cascade で消える。
 * - 重要なドメインデータ（採用済みの BillingEvent 等）は Application 経由で cascade されるが、
 *   会計監査ログ用途では将来 soft-delete + 個人情報マスクへ切替を検討。
 * 現状は: User レコードを匿名化＋ deletedAt セット＋ passwordHash null、認証不可にする。
 */
export async function DELETE() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const role = (session.user as { role?: string }).role
  if (role && role !== "seeker") {
    return Response.json(
      { error: "求職者アカウントの退会のみサポートしています" },
      { status: 403 }
    )
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, deletedAt: true },
  })
  if (!user) {
    return Response.json({ error: "ユーザーが見つかりません" }, { status: 404 })
  }
  if (user.deletedAt) {
    return Response.json({ error: "既に退会済みです" }, { status: 400 })
  }

  const anonymizedEmail = `deleted-${session.user.id}@deleted.local`

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      email: anonymizedEmail,
      name: null,
      phone: null,
      birthDate: null,
      city: null,
      resumeUrl: null,
      profilePublic: false,
      passwordHash: null,
      resetToken: null,
      resetTokenExpiry: null,
      emailVerifyToken: null,
      emailVerifyTokenExpiry: null,
      deletedAt: new Date(),
    },
  })

  if (user.email && !user.email.startsWith("deleted-")) {
    sendAccountDeletedEmail(user.email).catch((err) =>
      console.error("[account-delete] failed to send email:", err)
    )
  }

  return Response.json({ success: true })
}


import { type NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generateTemporaryPassword } from "@/lib/company-invitation"

const companySchema = z.object({
  name: z.string().min(1).max(200),
  industry: z.string().max(100).nullable().optional(),
  prefecture: z.string().max(10).nullable().optional(),
  city: z.string().max(50).nullable().optional(),
  address: z.string().nullable().optional(),
  employeeCount: z.string().max(50).nullable().optional(),
  description: z.string().nullable().optional(),
  logoUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
  websiteUrl: z.string().url().max(500).nullable().optional().or(z.literal("")),
  contactEmail: z.string().email().max(255).nullable().optional().or(z.literal("")),
  // 担当者アカウントの同時発行（任意）。
  // 自社で求人票を預かって代理掲載する運用向けに、メール認証なしで
  // ID/PASS を即発行し、そのまま求人登録できる状態にする。
  account: z
    .object({
      email: z.string().email().max(255),
      // 省略時は自動生成した仮パスワードを一度だけ返す
      password: z.string().min(8).max(100).optional(),
      name: z.string().max(100).optional(),
      // 社内運用アカウントは既定で初回変更を強制しない
      mustChangePassword: z.boolean().default(false),
    })
    .optional(),
})

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function POST(request: NextRequest) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "リクエストの形式が正しくありません" }, { status: 400 })
  }

  const parsed = companySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力内容に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const d = parsed.data
  const empty = (v: string | null | undefined) => (v && v.length > 0 ? v : null)

  // アカウント同時発行時は email 重複を先にチェック（会社だけ作られるのを防ぐ）
  if (d.account) {
    const existing = await prisma.companyUser.findUnique({
      where: { email: d.account.email },
      select: { id: true },
    })
    if (existing) {
      return Response.json(
        { error: "このメールアドレスは既に企業アカウントとして登録されています" },
        { status: 409 }
      )
    }
  }

  // admin が作成する企業は承認フローを経ずに即掲載可能（approved）にする。
  // 求人投稿 API は status=approved の企業のみ許可しているため必須。
  const company = await prisma.company.create({
    data: {
      name: d.name,
      industry: empty(d.industry),
      prefecture: empty(d.prefecture),
      city: empty(d.city),
      address: empty(d.address),
      employeeCount: empty(d.employeeCount),
      description: empty(d.description),
      logoUrl: empty(d.logoUrl),
      websiteUrl: empty(d.websiteUrl),
      contactEmail: empty(d.contactEmail),
      status: "approved",
      approvedAt: new Date(),
    },
  })

  if (!d.account) {
    return Response.json({ company }, { status: 201 })
  }

  // 担当者アカウント発行（メール認証なし・即ログイン可）
  const plainPassword = d.account.password ?? generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(plainPassword, 10)

  try {
    const companyUser = await prisma.companyUser.create({
      data: {
        companyId: company.id,
        email: d.account.email,
        passwordHash,
        name: d.account.name ?? null,
        role: "admin",
        mustChangePassword: d.account.mustChangePassword,
      },
      select: { id: true, email: true },
    })

    // パスワード平文はこのレスポンスでのみ返す（DB には保存しない）
    return Response.json(
      {
        company,
        account: {
          companyUserId: companyUser.id,
          email: companyUser.email,
          password: plainPassword,
          mustChangePassword: d.account.mustChangePassword,
          loginUrl: "/company/login",
        },
      },
      { status: 201 }
    )
  } catch (e) {
    // アカウント作成に失敗した場合も会社は作成済みなので、企業詳細から再発行できる旨を返す
    console.error("[admin.companies] account issue failed:", e)
    return Response.json(
      {
        company,
        warning:
          "企業は作成しましたが、アカウント発行に失敗しました。企業詳細ページから再発行してください。",
      },
      { status: 201 }
    )
  }
}

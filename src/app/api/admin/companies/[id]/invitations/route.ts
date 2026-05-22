import { type NextRequest } from "next/server"
import { z } from "zod"
import bcrypt from "bcryptjs"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  generateInvitationToken,
  generateTemporaryPassword,
  sendCompanyInviteEmail,
  INVITATION_EXPIRY_MS,
} from "@/lib/company-invitation"

const bodySchema = z.discriminatedUnion("method", [
  z.object({
    method: z.literal("email"),
    email: z.string().email().max(255),
    role: z.enum(["admin", "member"]).default("admin"),
  }),
  z.object({
    method: z.literal("direct"),
    email: z.string().email().max(255),
    role: z.enum(["admin", "member"]).default("admin"),
    name: z.string().max(100).optional(),
  }),
])

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }

  const { id: companyId } = await ctx.params

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { id: true, name: true },
  })
  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json(
      { error: "リクエスト形式が不正です" },
      { status: 400 }
    )
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "入力に誤りがあります", details: parsed.error.issues },
      { status: 400 }
    )
  }

  const d = parsed.data

  // 同 email の CompanyUser が既に存在する場合は弾く
  const existing = await prisma.companyUser.findUnique({
    where: { email: d.email },
  })
  if (existing) {
    return Response.json(
      { error: "このメールアドレスは既に企業アカウントとして登録されています" },
      { status: 409 }
    )
  }

  const adminUserId = (session.user as { id?: string }).id ?? null

  if (d.method === "email") {
    // 既存の未受領招待があれば再利用ではなく取り消して新規発行（運用シンプル化）
    await prisma.companyInvitation.deleteMany({
      where: { email: d.email, companyId, acceptedAt: null },
    })

    const token = generateInvitationToken()
    const expiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS)

    const invitation = await prisma.companyInvitation.create({
      data: {
        companyId,
        email: d.email,
        token,
        role: d.role,
        expiresAt,
        invitedById: adminUserId,
      },
    })

    try {
      await sendCompanyInviteEmail({
        email: d.email,
        companyName: company.name,
        token,
      })
    } catch (e) {
      // 送信失敗時は招待自体は残す（admin が再送 or URL コピーできる）
      return Response.json(
        {
          ok: true,
          method: "email",
          invitationId: invitation.id,
          token,
          expiresAt,
          warning:
            "招待は作成しましたがメール送信に失敗しました。URL を直接コピーして送ってください。",
          error: e instanceof Error ? e.message : String(e),
        },
        { status: 200 }
      )
    }

    return Response.json(
      {
        ok: true,
        method: "email",
        invitationId: invitation.id,
        token,
        expiresAt,
      },
      { status: 201 }
    )
  }

  // method === "direct"
  const tempPassword = generateTemporaryPassword()
  const passwordHash = await bcrypt.hash(tempPassword, 10)

  const companyUser = await prisma.companyUser.create({
    data: {
      companyId,
      email: d.email,
      passwordHash,
      name: d.name ?? null,
      role: d.role,
      mustChangePassword: true,
    },
  })

  // tempPassword は一度だけ返す（DB には平文を保存しない）
  return Response.json(
    {
      ok: true,
      method: "direct",
      companyUserId: companyUser.id,
      email: d.email,
      temporaryPassword: tempPassword,
      mustChangePassword: true,
    },
    { status: 201 }
  )
}

export async function GET(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }
  const { id: companyId } = await ctx.params

  const invitations = await prisma.companyInvitation.findMany({
    where: { companyId, acceptedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  return Response.json({ invitations })
}

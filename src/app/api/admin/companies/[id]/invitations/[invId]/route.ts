import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import {
  generateInvitationToken,
  sendCompanyInviteEmail,
  INVITATION_EXPIRY_MS,
} from "@/lib/company-invitation"

async function requireAdmin() {
  const session = await auth()
  if (!session?.user) return null
  const role = (session.user as { role?: string }).role
  if (role !== "admin") return null
  return session
}

/** 招待を取消（削除） */
export async function DELETE(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; invId: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }
  const { id: companyId, invId } = await ctx.params

  const inv = await prisma.companyInvitation.findUnique({
    where: { id: invId },
    select: { companyId: true, acceptedAt: true },
  })
  if (!inv || inv.companyId !== companyId) {
    return Response.json({ error: "招待が見つかりません" }, { status: 404 })
  }
  if (inv.acceptedAt) {
    return Response.json(
      { error: "既に受領済みのため取消できません" },
      { status: 409 }
    )
  }
  await prisma.companyInvitation.delete({ where: { id: invId } })
  return Response.json({ ok: true })
}

/** 再送（トークン再発行 + メール送信） */
export async function POST(
  _request: NextRequest,
  ctx: { params: Promise<{ id: string; invId: string }> }
) {
  const session = await requireAdmin()
  if (!session) {
    return Response.json({ error: "管理者権限が必要です" }, { status: 401 })
  }
  const { id: companyId, invId } = await ctx.params

  const inv = await prisma.companyInvitation.findUnique({
    where: { id: invId },
    include: { company: { select: { name: true } } },
  })
  if (!inv || inv.companyId !== companyId) {
    return Response.json({ error: "招待が見つかりません" }, { status: 404 })
  }
  if (inv.acceptedAt) {
    return Response.json(
      { error: "既に受領済みのため再送できません" },
      { status: 409 }
    )
  }

  const newToken = generateInvitationToken()
  const newExpiresAt = new Date(Date.now() + INVITATION_EXPIRY_MS)

  await prisma.companyInvitation.update({
    where: { id: invId },
    data: { token: newToken, expiresAt: newExpiresAt },
  })

  try {
    await sendCompanyInviteEmail({
      email: inv.email,
      companyName: inv.company.name,
      token: newToken,
    })
  } catch (e) {
    return Response.json(
      {
        ok: true,
        warning:
          "トークンは再発行しましたがメール送信に失敗しました。URL を直接コピーしてください。",
        error: e instanceof Error ? e.message : String(e),
      },
      { status: 200 }
    )
  }

  return Response.json({ ok: true, expiresAt: newExpiresAt })
}

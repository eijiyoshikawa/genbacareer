/**
 * POST   /api/users/me/company-follows/[companyId]  フォロー
 * DELETE                                              解除
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { trackEvent } from "@/lib/track"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { companyId } = await params

  const company = await prisma.company
    .findUnique({ where: { id: companyId }, select: { id: true, status: true, source: true } })
    .catch(() => null)
  if (!company) {
    return Response.json({ error: "企業が見つかりません" }, { status: 404 })
  }

  try {
    await prisma.companyFollow.create({
      data: { userId: session.user.id, companyId },
    })
    await trackEvent({
      name: "follow_company",
      userId: session.user.id,
      payload: { companyId },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.toLowerCase().includes("unique")) {
      return Response.json({ error: "フォローに失敗しました" }, { status: 500 })
    }
  }
  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { companyId } = await params
  await prisma.companyFollow
    .deleteMany({
      where: { userId: session.user.id, companyId },
    })
    .catch(() => ({ count: 0 }))
  return Response.json({ ok: true })
}

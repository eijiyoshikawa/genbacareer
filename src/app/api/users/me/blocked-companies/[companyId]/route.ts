/**
 * POST   /api/users/me/blocked-companies/[companyId] — ブロック追加
 * DELETE                                              — ブロック解除
 *
 * 17.3 ブロック企業 / NG キーワード設定。
 * 求職者専用、ログイン必須。max 200 件で頭打ち。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

const MAX_BLOCKED = 200

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { companyId } = await params

  // UUID 形式チェック
  if (!/^[0-9a-f-]{36}$/i.test(companyId)) {
    return Response.json({ error: "企業 ID が不正です" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { blockedCompanyIds: true },
  })
  if (!user) return Response.json({ error: "ユーザー不明" }, { status: 404 })

  if (user.blockedCompanyIds.includes(companyId)) {
    return Response.json({ ok: true, alreadyBlocked: true })
  }
  if (user.blockedCompanyIds.length >= MAX_BLOCKED) {
    return Response.json(
      { error: `ブロック企業は ${MAX_BLOCKED} 件までです` },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { blockedCompanyIds: [...user.blockedCompanyIds, companyId] },
  })
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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { blockedCompanyIds: true },
  })
  if (!user) return Response.json({ error: "ユーザー不明" }, { status: 404 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      blockedCompanyIds: user.blockedCompanyIds.filter((id) => id !== companyId),
    },
  })
  return Response.json({ ok: true })
}

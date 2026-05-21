/**
 * 求職者向けスカウト詳細 API。
 *
 * GET /api/scouts/[id]
 *   - 自分宛のスカウト詳細を返す
 *   - status=sent なら read に自動更新 (readAt = now())
 *   - 期限切れ (status=expired) はそのまま閲覧可能、ステータス変更しない
 *
 * PATCH /api/scouts/[id]
 *   - Body: { action: "decline", declineReason?: string }
 *   - status=declined に更新
 */

import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

type SessionUser = { id?: string; role?: string }

async function requireSeeker() {
  const session = await auth()
  if (!session?.user) return null
  const u = session.user as SessionUser
  if (!u.id) return null
  // 企業ユーザーは弾く (自社スカウト送信履歴は /api/company/scouts で取得)
  if (u.role === "company_admin" || u.role === "company_member") return null
  return { userId: u.id }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSeeker()
  if (!me) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const { id } = await params

  const scout = await prisma.scoutMessage.findUnique({
    where: { id },
    select: {
      id: true,
      userId: true,
      subject: true,
      body: true,
      status: true,
      sentAt: true,
      readAt: true,
      expiresAt: true,
      job: {
        select: { id: true, title: true, prefecture: true, category: true },
      },
      company: { select: { id: true, name: true, logoUrl: true } },
    },
  })

  if (!scout || scout.userId !== me.userId) {
    return NextResponse.json({ error: "スカウトが見つかりません" }, { status: 404 })
  }

  // 未読 → 既読 (期限切れ / 辞退済みは status 変更しない)
  if (scout.status === "sent") {
    await prisma.scoutMessage.update({
      where: { id: scout.id },
      data: { status: "read", readAt: new Date() },
    })
  }

  return NextResponse.json({ scout })
}

const patchSchema = z.object({
  action: z.literal("decline"),
  declineReason: z.string().max(200).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const me = await requireSeeker()
  if (!me) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const { id } = await params

  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: "JSON が不正です" }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      { error: "入力エラー", issues: parsed.error.issues },
      { status: 400 },
    )
  }

  const scout = await prisma.scoutMessage.findUnique({
    where: { id },
    select: { id: true, userId: true, status: true },
  })

  if (!scout || scout.userId !== me.userId) {
    return NextResponse.json({ error: "スカウトが見つかりません" }, { status: 404 })
  }

  if (scout.status === "expired" || scout.status === "declined") {
    return NextResponse.json(
      { error: "このスカウトは既に終了しています" },
      { status: 409 },
    )
  }

  await prisma.scoutMessage.update({
    where: { id },
    data: {
      status: "declined",
      declineReason: parsed.data.declineReason ?? null,
    },
  })

  return NextResponse.json({ ok: true })
}

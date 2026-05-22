/**
 * POST   /api/users/me/favorites/[jobId] — お気に入り追加
 * DELETE                                  — 削除
 *
 * 求職者専用。重複追加は 200 を返す（idempotent）。
 */

import { type NextRequest } from "next/server"
import { Prisma } from "@prisma/client"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { trackEvent } from "@/lib/track"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { jobId } = await params

  // 存在チェック（無いものを保存させない）
  const job = await prisma.job
    .findUnique({ where: { id: jobId }, select: { id: true } })
    .catch(() => null)
  if (!job) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  try {
    await prisma.jobFavorite.create({
      data: { userId: session.user.id, jobId },
    })
    void trackEvent({
      name: "favorite_add",
      userId: session.user.id,
      payload: { jobId },
    })
  } catch (e) {
    // P2002: 重複（既にお気に入り）の場合はそのまま 200（idempotent）
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return Response.json({ ok: true })
    }
    return Response.json({ error: "保存に失敗しました" }, { status: 500 })
  }
  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const { jobId } = await params
  await prisma.jobFavorite
    .deleteMany({
      where: { userId: session.user.id, jobId },
    })
    .catch(() => ({ count: 0 }))
  void trackEvent({
    name: "favorite_remove",
    userId: session.user.id,
    payload: { jobId },
  })
  return Response.json({ ok: true })
}

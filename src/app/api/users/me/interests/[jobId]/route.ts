/**
 * POST   /api/users/me/interests/[jobId] - 「気になる」追加 (12.3)
 * DELETE                                    - 解除
 *
 * お気に入り (JobFavorite) より軽い意思表示。
 * 重複追加は 200 idempotent。trackEvent("interest_click") も飛ばす。
 */

import { type NextRequest } from "next/server"
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

  const job = await prisma.job
    .findUnique({ where: { id: jobId }, select: { id: true } })
    .catch(() => null)
  if (!job) {
    return Response.json({ error: "求人が見つかりません" }, { status: 404 })
  }

  try {
    await prisma.jobInterest.create({
      data: { userId: session.user.id, jobId },
    })
    void trackEvent({
      name: "interest_click",
      userId: session.user.id,
      payload: { jobId },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (!msg.toLowerCase().includes("unique")) {
      return Response.json({ error: "登録に失敗しました" }, { status: 500 })
    }
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
  await prisma.jobInterest
    .delete({
      where: { userId_jobId: { userId: session.user.id, jobId } },
    })
    .catch(() => {})
  return Response.json({ ok: true })
}

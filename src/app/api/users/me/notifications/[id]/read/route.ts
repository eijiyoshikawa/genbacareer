/**
 * POST /api/users/me/notifications/[id]/read
 * 当該通知を既読にする。所有者のみ。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const { id } = await params

  const result = await prisma.notification
    .updateMany({
      where: { id, userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    .catch(() => ({ count: 0 }))

  return Response.json({ updated: result.count })
}

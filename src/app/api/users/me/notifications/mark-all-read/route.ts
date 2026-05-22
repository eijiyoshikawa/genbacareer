/**
 * POST /api/users/me/notifications/mark-all-read
 * ログインユーザーの未読通知を一括既読化。HTML form からも叩けるよう redirect 対応。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    if (request.headers.get("content-type")?.includes("form")) {
      return Response.redirect(new URL("/login", request.url), 303)
    }
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  await prisma.notification
    .updateMany({
      where: { userId: session.user.id, readAt: null },
      data: { readAt: new Date() },
    })
    .catch(() => ({ count: 0 }))

  // <form> から叩かれた場合は通知ページに戻す
  if (request.headers.get("content-type")?.includes("form")) {
    return Response.redirect(new URL("/mypage/notifications", request.url), 303)
  }
  return Response.json({ ok: true })
}

/**
 * GET /api/users/me/favorites — お気に入り求人 ID 一覧（軽量）
 */

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }
  const rows = await prisma.jobFavorite
    .findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: { jobId: true, createdAt: true },
    })
    .catch(() => [])
  return Response.json({ items: rows })
}

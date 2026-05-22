/**
 * 旧: フォーム経由の応募 API
 *
 * 応募導線を LINE 公式アカウントへ集約したため、本エンドポイントは廃止。
 * POST すると 410 Gone を返し、新しい LINE 導線 (/jobs/[id]/apply) へ誘導する。
 *
 * GET は /api/users/me/applications で代用する（旧データの参照用に残す）。
 */

import { type NextRequest } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export const dynamic = "force-dynamic"

export function POST() {
  return Response.json(
    {
      error: "gone",
      message:
        "メール応募は廃止されました。求人詳細ページの「LINE で応募」から、公式 LINE 経由でお問い合わせください。",
      replacement: "/jobs/[id]/apply",
    },
    { status: 410 }
  )
}

/**
 * GET は引き続き「自分の応募履歴」を返す（既存データの参照用）。
 * 新規応募はすべて LINE 経由のため、本一覧は時間とともに静的になる。
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return Response.json({ error: "ログインが必要です" }, { status: 401 })
  }

  const url = new URL(request.url)
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") ?? "20")))

  const applications = await prisma.application.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      job: {
        select: {
          id: true,
          title: true,
          prefecture: true,
          city: true,
          company: { select: { name: true } },
        },
      },
    },
  })

  return Response.json({ applications })
}

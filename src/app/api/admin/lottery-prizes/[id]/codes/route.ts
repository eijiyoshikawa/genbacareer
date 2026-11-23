/**
 * POST /api/admin/lottery-prizes/[id]/codes
 * Amazon ギフト等のコードを在庫プールに一括登録する。認証: admin 必須。
 *
 * Body: { codes: string }  // 改行・カンマ・空白区切りで複数可
 * 当選時に 1 枚ずつ自動割り当て＆ LINE 自動送付される。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  const role = (session?.user as { role?: string } | undefined)?.role
  if (!session?.user) return Response.json({ error: "Unauthorized" }, { status: 401 })
  if (role !== "admin") return Response.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const prize = await prisma.lotteryPrize.findUnique({ where: { id }, select: { id: true, kind: true } })
  if (!prize) return Response.json({ error: "景品が見つかりません" }, { status: 404 })
  if (prize.kind !== "amazon_gift") {
    return Response.json(
      { error: "コード登録はAmazonギフト景品にのみ対応しています" },
      { status: 400 },
    )
  }

  let body: { codes?: string } = {}
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Bad Request" }, { status: 400 })
  }

  // 改行・カンマ・タブ・空白で分割し、重複・空を除去
  const codes = Array.from(
    new Set(
      (body.codes ?? "")
        .split(/[\s,]+/)
        .map((c) => c.trim())
        .filter((c) => c.length > 0 && c.length <= 255),
    ),
  )
  if (codes.length === 0) {
    return Response.json({ error: "コードが入力されていません" }, { status: 400 })
  }
  if (codes.length > 5000) {
    return Response.json({ error: "一度に登録できるのは5000件までです" }, { status: 400 })
  }

  // 既存コードと衝突する分は skipDuplicates でスキップ
  const result = await prisma.giftCode.createMany({
    data: codes.map((code) => ({ prizeId: id, code })),
    skipDuplicates: true,
  })

  const available = await prisma.giftCode.count({
    where: { prizeId: id, status: "available" },
  })

  return Response.json({
    ok: true,
    added: result.count,
    skipped: codes.length - result.count,
    available,
  })
}

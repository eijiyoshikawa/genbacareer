/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * updateMany の where: companyId フィルタで自動除外される。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

// "hired" は意図的に除外。採用確定には hiredAt の記録・請求書生成・候補者への通知が必要であり、
// これらは個別の PUT /api/company/applications/[id] エンドポイントでのみ処理される。
const ALLOWED_STATUSES = [
  "reviewing",
  "interview",
  "offered",
  "rejected",
] as const

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(ALLOWED_STATUSES),
})

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 })
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json(
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { ids, status } = parsed.data

  const result = await prisma.application.updateMany({
    where: {
      id: { in: ids },
      companyId,
    },
    data: { status },
  })

  return Response.json({ ok: true, updated: result.count })
}

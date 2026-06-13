/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: number }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * companyId フィルタで自動除外される。
 *
 * ステータス遷移: 個別更新と同じ遷移ルールを適用し、無効な遷移はスキップする。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  applied: ["reviewing", "rejected"],
  reviewing: ["interview", "rejected"],
  interview: ["offered", "rejected"],
  offered: ["hired", "rejected"],
}

const ALLOWED_STATUSES = [
  "applied",
  "reviewing",
  "interview",
  "offered",
  "hired",
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
  const { ids, status: newStatus } = parsed.data

  // 現在のステータスを取得し、有効な遷移の ID のみ更新対象にする
  const applications = await prisma.application.findMany({
    where: { id: { in: ids }, companyId },
    select: { id: true, status: true },
  })

  const validIds = applications
    .filter((app) => {
      const allowed = VALID_STATUS_TRANSITIONS[app.status]
      return allowed?.includes(newStatus)
    })
    .map((app) => app.id)

  const skipped = ids.length - validIds.length

  if (validIds.length === 0) {
    return Response.json({ ok: true, updated: 0, skipped })
  }

  const result = await prisma.application.updateMany({
    where: { id: { in: validIds }, companyId },
    data: { status: newStatus },
  })

  return Response.json({ ok: true, updated: result.count, skipped })
}

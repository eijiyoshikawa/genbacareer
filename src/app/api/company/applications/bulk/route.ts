/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number }
 *
 * 制約:
 * - hired は一括変更不可（請求書発行・hiredAt 打刻が必要なため個別ルートで対応）
 * - 終端ステータス (hired / rejected) 済みの応募は除外して更新しない
 * - statusHistory を各レコードに記録する
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * companyId フィルタで自動除外される。
 */

import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { z } from "zod"

// hired は個別ルートで処理（請求書作成・hiredAt 打刻を伴うため）
const BULK_ALLOWED_STATUSES = [
  "reviewing",
  "interview",
  "offered",
  "rejected",
] as const

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
  note?: string
}

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(BULK_ALLOWED_STATUSES),
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
      {
        error:
          "Bad Request — hired への一括変更は個別ルートで行ってください",
        issues: parsed.error.issues,
      },
      { status: 400 }
    )
  }
  const { ids, status } = parsed.data

  // 自社かつ終端ステータス未完の応募のみ対象とする
  const targets = await prisma.application.findMany({
    where: {
      id: { in: ids },
      companyId,
      status: { notIn: ["hired", "rejected"] },
    },
    select: { id: true, status: true, statusHistory: true },
  })

  if (targets.length === 0) {
    return Response.json({ ok: true, updated: 0 })
  }

  const now = new Date().toISOString()

  await prisma.$transaction(
    targets.map((app: { id: string; status: string; statusHistory: unknown }) => {
      const history = Array.isArray(app.statusHistory)
        ? (app.statusHistory as unknown as StatusHistoryEntry[])
        : []
      const entry: StatusHistoryEntry = {
        from: app.status,
        to: status,
        at: now,
        by: companyId,
        note: "一括変更",
      }
      return prisma.application.update({
        where: { id: app.id },
        data: {
          status,
          statusHistory: [...history, entry],
        },
      })
    })
  )

  return Response.json({ ok: true, updated: targets.length })
}

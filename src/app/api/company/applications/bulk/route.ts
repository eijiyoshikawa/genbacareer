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

/**
 * 一括変更で許可するステータスと、その遷移元。
 *
 * 面接 / 内定 / 採用 は個別ルート (PUT /api/company/applications/[id]) でのみ
 * 変更可能: 採用時の成功報酬請求 (createHiringInvoice) と hiredAt 打刻、
 * 応募者への通知を確実に通すため。一括で「採用」にすると請求が発生せず
 * 早期退職返金の基準日も欠落していた。
 */
const BULK_TRANSITIONS = {
  reviewing: ["applied"],
  rejected: ["applied", "reviewing", "interview", "offered"],
} as const

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(["reviewing", "rejected"]),
})

type StatusHistoryEntry = {
  from: string
  to: string
  at: string
  by: string
  note?: string
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const role = (session.user as { role?: string }).role
  const companyId = (session.user as { companyId?: string }).companyId
  if ((role !== "company_admin" && role !== "company_member") || !companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const userId = (session.user as { id?: string }).id ?? "unknown"

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
          "一括変更できるのは「選考中」「不採用」のみです。面接・内定・採用は応募者ごとに変更してください。",
        issues: parsed.error.issues,
      },
      { status: 400 }
    )
  }
  const { ids, status } = parsed.data
  const fromStatuses = [...BULK_TRANSITIONS[status]]

  // 自社 かつ 遷移可能なステータスの応募のみ対象
  const targets = await prisma.application.findMany({
    where: { id: { in: ids }, companyId, status: { in: fromStatuses } },
    select: { id: true, status: true, statusHistory: true },
  })

  const at = new Date().toISOString()
  const results = await prisma.$transaction(
    targets.map((a) => {
      const history = Array.isArray(a.statusHistory)
        ? (a.statusHistory as unknown as StatusHistoryEntry[])
        : []
      return prisma.application.updateMany({
        // 並行更新で状態が変わっていた場合は更新しない
        where: { id: a.id, companyId, status: a.status },
        data: {
          status,
          statusHistory: [
            ...history,
            { from: a.status, to: status, at, by: userId },
          ] as unknown as object,
        },
      })
    })
  )

  const updated = results.reduce((sum, r) => sum + r.count, 0)
  return Response.json({ ok: true, updated, skipped: ids.length - updated })
}

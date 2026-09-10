/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: { id: string, error: string }[] }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象（changeApplicationStatus
 * が id ごとに companyId を検証する）。
 *
 * 以前は prisma.application.updateMany で status 列だけを直接書き換えており、
 * 単一更新 (PUT /[id]) が課している状態遷移バリデーション・statusHistory
 * 監査ログ・hiredAt 打刻・成果報酬請求 (createHiringInvoice) を全てバイパス
 * していた。一括で「採用」にしても請求書が一切発行されない、という
 * サイレントな売上損失バグだったため、単一更新と同じ
 * changeApplicationStatus() を id ごとに呼ぶ形に修正。
 */

import { auth } from "@/lib/auth"
import { z } from "zod"
import { changeApplicationStatus } from "@/lib/application-status"

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
  const by = (session.user as { id?: string }).id ?? "unknown"

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

  const results = await Promise.all(
    ids.map((id) =>
      changeApplicationStatus({ id, companyId, newStatus: status, by })
    )
  )

  const updated = results.filter((r) => r.ok).length
  const skipped = results
    .filter((r): r is { ok: false; id: string; error: string } => !r.ok)
    .map((r) => ({ id: r.id, error: r.error }))

  return Response.json({ ok: true, updated, skipped })
}

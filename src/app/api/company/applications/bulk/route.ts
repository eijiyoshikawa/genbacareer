/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: { id: string, reason: string }[] }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * applyApplicationStatusChange 内の companyId チェックで自動除外される。
 *
 * 単体更新 (PUT /api/company/applications/[id]) と同じ
 * applyApplicationStatusChange を通すことで、遷移ルール検証・
 * statusHistory 記録・hired 時の成果報酬請求・通知を一括更新でも確実に行う。
 */

import { auth } from "@/lib/auth"
import { applyApplicationStatusChange } from "@/lib/application-status"
import { z } from "zod"

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
  const { ids, status } = parsed.data
  const actorUserId = (session.user as { id?: string }).id ?? "unknown"

  let updated = 0
  const skipped: { id: string; reason: string }[] = []

  // 逐次実行: 採用確定時の請求書発行 (外部 API 呼び出し) を含むため、
  // 大量同時実行による外部サービスへの負荷/競合を避ける。
  for (const id of ids) {
    const result = await applyApplicationStatusChange({
      applicationId: id,
      companyId,
      newStatus: status,
      actorUserId,
    })
    if (result.ok) {
      updated += 1
    } else {
      skipped.push({
        id,
        reason:
          result.reason === "not_found"
            ? "not_found"
            : `invalid_transition:${result.currentStatus}`,
      })
    }
  }

  return Response.json({ ok: true, updated, skipped })
}

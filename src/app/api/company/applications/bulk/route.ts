/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: Array<{ id, error }> }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象（updateApplicationStatus 内で
 * companyId を照合し、他社の ID は skipped に回る）。
 *
 * 1 件ずつ updateApplicationStatus() に委譲する（かつては updateMany で直接
 * status を書き換えていたため、状態遷移バリデーション・hiredAt 打刻・採用時の
 * 自動請求・通知が一括更新経路だけ丸ごと素通りしていた）。
 */

import { auth } from "@/lib/auth"
import { z } from "zod"
import { updateApplicationStatus, APPLICATION_STATUSES } from "@/lib/application-status"

const schema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(200),
  status: z.enum(APPLICATION_STATUSES),
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
      { error: "Bad Request", issues: parsed.error.issues },
      { status: 400 }
    )
  }
  const { ids, status } = parsed.data

  let updated = 0
  const skipped: Array<{ id: string; error: string }> = []
  for (const id of ids) {
    const result = await updateApplicationStatus({
      applicationId: id,
      companyId,
      newStatus: status,
      by: userId,
    })
    if (result.ok) {
      updated++
    } else {
      skipped.push({ id, error: result.error })
    }
  }

  return Response.json({ ok: true, updated, skipped })
}

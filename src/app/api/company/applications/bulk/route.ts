/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, skipped: number }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * applyApplicationStatusTransition 内の companyId チェックで自動除外される。
 *
 * 単体更新 (PUT /api/company/applications/[id]) と同じ
 * applyApplicationStatusTransition を1件ずつ呼び出す。以前は素の
 * updateMany で status カラムだけを書き換えていたため、一括で「採用」に
 * 変更しても遷移ルール検証・hiredAt 打刻・自動請求 (createHiringInvoice)・
 * statusHistory 記録・求職者通知がすべて素通りしていた
 * (=一括操作だけ請求が発生しない抜け道になっていた)。
 */

import { auth } from "@/lib/auth"
import { z } from "zod"
import { applyApplicationStatusTransition } from "@/lib/application-status-transition"

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
  const userId = (session.user as { id?: string }).id ?? "unknown"

  let updated = 0
  let skipped = 0
  for (const applicationId of ids) {
    const result = await applyApplicationStatusTransition({
      applicationId,
      companyId,
      userId,
      newStatus: status,
    })
    if (result.ok) {
      updated += 1
    } else {
      skipped += 1
    }
  }

  return Response.json({ ok: true, updated, skipped })
}

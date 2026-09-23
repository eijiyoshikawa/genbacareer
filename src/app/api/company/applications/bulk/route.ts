/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, failed: Array<{ id: string, error: string }> }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * applyApplicationStatusChange 内の companyId 一致チェックで自動除外される。
 *
 * 1 件ずつ applyApplicationStatusChange (単体更新 PUT と共通のロジック) を通す。
 * これにより、状態遷移の妥当性チェック・hired 時の hiredAt 打刻・
 * 採用確定請求 (createHiringInvoice) が一括更新でも単体更新と同様に働く
 * (以前は updateMany で status だけ書き換えていたため、一括で「採用」に
 * 変更すると請求書が作成されず、不正な遷移も素通りしていた)。
 */

import { auth } from "@/lib/auth"
import { z } from "zod"
import { applyApplicationStatusChange } from "@/lib/application-status"

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
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
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

  // 重複 id はまとめて 1 回だけ処理する
  const uniqueIds = [...new Set(ids)]

  let updated = 0
  const failed: Array<{ id: string; error: string }> = []

  for (const id of uniqueIds) {
    const result = await applyApplicationStatusChange({
      id,
      companyId,
      userId,
      newStatus: status,
    })
    if (result.ok) {
      updated++
    } else {
      failed.push({ id, error: result.error })
    }
  }

  return Response.json({ ok: true, updated, failed })
}

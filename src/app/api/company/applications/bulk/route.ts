/**
 * POST /api/company/applications/bulk
 *
 * 自社 (companyId 一致) の応募者を一括でステータス変更する。
 * Body: { ids: string[], status: string }
 * 応答: { ok: true, updated: number, failed: { id: string, error: string }[] }
 *
 * セキュリティ: 自社が紐づく Application のみ更新対象。他社の ID が紛れても
 * applyApplicationStatusChange 内の companyId チェックで自動除外される。
 *
 * 単体更新 (/api/company/applications/[id]) と同じ
 * applyApplicationStatusChange を使うことで、状態遷移バリデーション・
 * hiredAt 打刻・採用確定時の請求作成・通知/メール送信を一括更新でも
 * 必ず経由させる。
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
  const role = (session.user as { role?: string }).role
  if (role !== "company_admin" && role !== "company_member") {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const companyId = (session.user as { companyId?: string }).companyId
  if (!companyId) {
    return Response.json({ error: "Forbidden" }, { status: 403 })
  }
  const actorUserId = (session.user as { id?: string }).id ?? "unknown"

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

  const failed: { id: string; error: string }[] = []
  let updated = 0

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
      failed.push({ id, error: result.error })
    }
  }

  return Response.json({ ok: true, updated, failed })
}
